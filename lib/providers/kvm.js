const child = require('child_process');
const ssh = require('ssh2-client');
const fs = require('fs-extra');
const mustache = require('mustache');
mustache.escape = text => text;
const path = require('path');
const portAvailable = require('is-port-available');

const env = require('../env');
const ping = require('../health');

const { registry, slimdir, scriptdir } = env.vars();

const privateKey = path.join(slimdir, 'baker_rsa');

class KVM {
    constructor() {
        this.defaultOptions = {
            cpus: 1,
            mem: 1024,
            syncs: [],
            disk: false,
            verbose: true,
            ssh_port: undefined // auto-find an available port
        };
    }

    async exec(cmd, verbose=false) {
        let opts = verbose ? { stdio: 'inherit' } : {};

        return child.execSync(`virsh -c qemu:///session ${cmd}`, opts);
    }

    async create(name, options) {
        let { image } = options;
        // since we are mounting by label rather than directory,
        // we need to create a label for each sync
        let syncs = (options.syncs || this.defaultOptions.syncs).map((syncs, index) => {
            let [ host, guest ] = syncs.split(';');

            return {
                host,
                guest,
                label: `share${index}`,
            };
        });

        let sshPort = this.defaultOptions.ssh_port || await this.findAvailablePort();

        let args = {
            name,
            cpus: options.cpus || this.defaultOptions.cpus,
            mem: options.mem || this.defaultOptions.mem,
            syncs,
            kernel: path.join(registry, image, 'vmlinuz'),
            initrd: path.join(registry, image, 'initrd'),
            ssh_port: options.sshPort || sshPort
        };

        let xml = (await fs.readFile(path.join(scriptdir, 'scripts', 'kvm.xml.mustache'))).toString();
        let render = mustache.render(xml, args);
        let output = path.join(slimdir, `${name}.xml`);

        await fs.writeFile(output, render);

        await this.exec(`create ${output}`, true);

        let sshInfo = await this.getSSHConfig(name);
        console.log(`ssh -i ${sshInfo.private_key} ${sshInfo.user}@${sshInfo.hostname} -p ${sshInfo.port} -o StrictHostKeyChecking=no`);
    }

    async delete(name) {
        await this.exec(`undefine ${name}`);
    }

    async stop(name) {
        await this.exec(`destroy ${name}`);
    }

    async exists(name) {
        let dir = path.join(registry, name);

        return await fs.exists(path.join(dir, 'vmlinuz')) && await fs.exists(path.join(dir, 'initrd'));
    }

    async health(name) {
        const sshInfo = await this.getSSHConfig(name);
        return ping(sshInfo);
    }

    async size(name) {
        let dir = path.join(registry, name);

        return fs.statSync(path.join(dir, 'vmlinuz')).size + fs.statSync(path.join(dir, 'initrd')).size;
    }

    async list() {
        let output = (await this.exec(`list --all --title`)).toString();
        // format is:
        // Id   Name    State
        // ------------------
        // []   []      []
        return output
            .trim()
            .split('\n')
            .splice(2,)
            .map(e => {
                let [ id, name, state, title ] = e.trim().split(/\s+/);

                return {
                    id,
                    name,
                    state,
                    title
                };
            })
            .filter(e => e.title === 'slim')
            .map(e => { delete e.title; return e });
    }

    async getSSHConfig(name) {
        let port = await this.getSSHPort(name);

        return {user: 'root', port: port, host: name, hostname: '127.0.0.1', private_key: privateKey};
    }

    async findAvailablePort(startPort=2002, endPort=2999) {
        let port = startPort;
        let blacklistPorts = await this.portsUsedByVMs();

        while (port <= endPort) {
            if (!blacklistPorts[port]) {
                let status = await portAvailable(port);
                if (status) {
                    console.log(`Port ${port} is available for SSH on localhost!`);
                    return port;
                }
            }
            port++;
        }
        throw new Error(`Couldn't find open port between ${startPort} and ${endPort}`);
    }

    async portsUsedByVMs() {
        let vms = await this.list();

        let ports = [];
        for (const vm of vms) {
            let port = await this.getSSHPort(vm.name);
            ports.push(port);
        }

        return ports;
    }

    async getSSHPort(name) {
        let re = /^.+hostfwd=tcp::(\d+)-:22.+$/gm;
        let xml = await this.exec(`dumpxml ${name}`);
        let [, port, ] = re.exec(xml);

        return port;
    }

    async attach(name) {
        const sshInfo = await this.getSSHConfig(name);
        ssh.shell(`${sshInfo.user}@${sshInfo.hostname}`, {port: sshInfo.port, privateKey: sshInfo.private_key, readyTimeout: 30000});
    }
}

module.exports = new KVM();
