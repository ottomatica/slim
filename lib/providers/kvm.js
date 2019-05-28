const child = require('child_process');
const fs = require('fs-extra');
const mustache = require('mustache');
mustache.escape = text => text;
const path = require('path');

const env = require('../env');

const { registry, slimdir, scriptdir } = env.vars();

class KVM {
    constructor() {
        this.defaultOptions = {
            cpus: 1,
            mem: 1024,
            disk: false,
            verbose: true,
            ssh_port: 2002 // TODO add ssh port-searching
        };
    }

    async create(name, options) {
        let { image } = options;

        let args = {
            name,
            cpus: options.cpus || this.defaultOptions.cpus,
            mem: options.mem || this.defaultOptions.mem,
            kernel: path.join(registry, image, 'vmlinuz'),
            initrd: path.join(registry, image, 'initrd')
        };

        let xml = (await fs.readFile(path.join(scriptdir, 'scripts', 'kvm.xml.mustache'))).toString();
        let render = mustache.render(xml, args);
        let output = path.join(slimdir, `${name}.xml`);

        await fs.writeFile(output, render);

        child.execSync(`virsh -c qemu:///session create ${output}`, { stdio: 'inherit' });
        // forward ssh
        child.execSync(`virsh -c qemu:///session qemu-monitor-command --hmp ${name} 'hostfwd_add ::${this.defaultOptions.ssh_port}-:22'`, { stdio: 'inherit' });
        console.log(`ssh -i /home/gjabell/.slim/baker_rsa root@127.0.0.1 -p ${this.defaultOptions.ssh_port} -o StrictHostKeyChecking=no`);
    }

    async delete(name) {
        child.execSync(`virsh -c qemu:///session destroy ${name}`);
    }

    async exists(name) {
        let dir = path.join(registry, name);

        return await fs.exists(path.join(dir, 'vmlinuz')) && await fs.exists(path.join(dir, 'initrd'));
    }

    async size(name) {
        let dir = path.join(registry, name);

        return fs.statSync(path.join(dir, 'vmlinuz')).size + fs.statSync(path.join(dir, 'initrd')).size;
    }

    async list() {
        child.execSync(`virsh -c qemu:///session list --all`, { stdio: 'inherit' });
    }
}

module.exports = new KVM();
