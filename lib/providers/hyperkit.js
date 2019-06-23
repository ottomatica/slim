const child = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const sudo = async (cmd, opts) => {
    return new Promise((resolve, reject) => {
        require('sudo-prompt').exec(cmd, opts, (err, stdout) => {
            if (err) reject(err);
            else resolve(stdout);
        });
    });
};
const uuid4 = require('uuid/v4');

const { info } = require('../logger');
const env = require('../env');

const { registry, scriptdir, slimdir } = env.vars();

const privateKey = path.join(slimdir, 'baker_rsa');

const sudoOpts = { name: 'slim' };

const u9fsPath = path.join(scriptdir, 'scripts', 'u9fs');
const uuidPath = path.join(scriptdir, 'scripts', 'uuid2mac');
const hyperDir = path.join(slimdir, 'hyperkit');

class Hyperkit {
    constructor() {
        this.defaultOptions = {
            cpus: 1,
            mem: 1024,
            syncs: [],
            disk: false,
            verbose: true,
        };
    }

    async create(name, options) {
        let { cpus, image, mem, syncs } = options;
        cpus = cpus || this.defaultOptions.cpus;
        mem = mem || this.defaultOptions.mem;

        const baseDir = path.join(hyperDir, name);
        const initrdPath = path.join(registry, image, 'initrd');
        const kernelPath = path.join(registry, image, 'vmlinuz');

        await Promise.all([
            await fs.ensureDir(hyperDir),
            this.delete(name),
            await fs.emptyDir(baseDir),
        ]);

        syncs = (syncs || this.defaultOptions.syncs).map((sync, index) => this.start9p(name, sync, index));

        // get the mac address that we will use to find the ip
        const uuid = uuid4();
        const mac = await this.uuidToMac(uuid);
        fs.writeFileSync(path.join(baseDir, 'hyperkit.mac'), mac);

        // make sure the cmdline options are in quotes
        const cmdline = `"modules=virtio_net console=ttyS0"`;
        // we need to run hyperkit with sudo, since we can't create the virtio-net
        // interface as a normal user
        const cmd = `hyperkit \
            -m ${mem} -c ${cpus} \
            -s 0:0,hostbridge -s 31,lpc \
            -s 2:0,virtio-net -l com1,stdio \
            ${syncs.join(' ')} \
            -F ${path.join(baseDir, 'hyperkit.pid')} \
            -U ${uuid} \
            -f kexec,${kernelPath},${initrdPath},${cmdline} \
            2>&1 >> ${path.join(baseDir, 'hyperkit.log')} &
        `;
        info('Running hyperkit');
        try {
            await sudo(cmd, sudoOpts);
        } catch (e) { undefined }

        info('Waiting for IP address');
        let sshInfo = await this.getSSHConfig(name);
        console.log(`ssh -i ${sshInfo.private_key} ${sshInfo.user}@${sshInfo.hostname} -p ${sshInfo.port} -o StrictHostKeyChecking=no`);
    }

    async delete(name) {
        await this._killProcess(name, 'hyperkit');

        await fs.remove(path.join(slimdir, 'hyperkit', name));
    }

    async _killProcess(name, process) {
        const baseDir = path.join(slimdir, 'hyperkit', name);
        const pidPath = path.join(baseDir, `${process}.pid`);

        let pid = fs.existsSync(pidPath) ? fs.readFileSync(pidPath) : undefined;

        try {
            if (pid) {
                await sudo(`kill -9 ${pid}`, sudoOpts);
            }
        } catch (e) { undefined; }

        await fs.remove(pidPath);
    }

    async exists(name) {
        let dir = path.join(registry, name);

        return await fs.exists(path.join(dir, 'initrd'));
    }

    async size(name) {
        let dir = path.join(registry, name);

        return fs.statSync(path.join(dir, 'initrd')).size + fs.statSync(path.join(dir, 'vmlinuz')).size;
    }

    async list() {
        let hyperDir = path.join(slimdir, 'hyperkit');
        await fs.ensureDir(hyperDir);

        return fs.readdirSync(hyperDir)
            .filter(name => !(/(^|\/)\.[^/.]/g).test(name))
            .map((name, index) => ({ id: index, name }));
    }

    async getSSHConfig(name) {
        let mac = fs.readFileSync(path.join(slimdir, 'hyperkit', name, 'hyperkit.mac')).toString().trim();
        let ip = await this.macToIP(mac);

        return {user: 'root', port: '22', host: name, hostname: ip, private_key: privateKey};
    }

    async uuidToMac(uuid) {
        return await sudo(`${uuidPath} ${uuid}`, sudoOpts);
    }

    async macToIP(mac) {
        // for some reason the leading zeros in numbers are stripped
        mac = mac.split(':').map(v => v.replace(/^0/, '')).join(':');

        let ip;
        do {
            ip = child.execSync(`
                cat /var/db/dhcpd_leases | \
                grep ${mac} -B 1 | \
                cut -d"=" -f2 | \
                head -1
            `).toString().trim();
            await new Promise(resolve => setTimeout(resolve, 1000));
        } while (!ip);

        return ip;
    }

    start9p(name, sync, num) {
        let baseDir = path.join(hyperDir, name);

        let sockName = `share${num}`
        let [ host, ] = sync.split(';');
        let socket = path.join(baseDir, `${sockName}.socket`);

        let proc = child.spawn(u9fsPath,
            ['-addr', `unix:${socket}`, '-root', host],
            {detached: true, stdio: 'ignore'});
        fs.writeFileSync(path.join(baseDir, `${sockName}.pid`), proc.pid);
        proc.unref();

        // start numbering at 3
        return `-s ${3+num},virtio-9p,path=${socket},tag=${sockName}`;
    }
}

module.exports = new Hyperkit();
