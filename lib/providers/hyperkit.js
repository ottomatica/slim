const fs = require('fs-extra');
const path = require('path');
const sudo = require('sudo-prompt');

const env = require('../env');

const { registry, slimdir } = env.vars();

const privateKey = path.join(slimdir, 'baker_rsa');

const sudoOpts = { name: 'slim' };

class Hyperkit {
    constructor() {
        this.defaultOptions = {
            cpus: 1,
            mem: 1024,
            disk: false,
            verbose: true,
        };
    }

    async create(name, options) {
        let { cpus, image, mem } = options;
        cpus = cpus || this.defaultOptions.cpus;
        mem = mem || this.defaultOptions.mem;

        const hyperDir = path.join(slimdir, 'hyperkit');
        const baseDir = path.join(hyperDir, name);
        const initrdPath = path.join(registry, image, 'initrd');
        const kernelPath = path.join(registry, image, 'vmlinuz');

        await Promise.all([
            fs.ensureDir(hyperDir),
            this.delete(name),
            fs.emptyDir(baseDir),
        ]);

        const hyperLog = path.join(baseDir, 'hyperkit.log');
        // make sure the cmdline options are in quotes
        const cmdline = `"modules=virtio_net console=ttyS0"`;
        // we need to run hyperkit with sudo, since we can't create the virtio-net
        // interface as a normal user
        const cmd = `hyperkit \
            -m ${mem} -c ${cpus} \
            -s 0:0,hostbridge -s 31,lpc \
            -s 2:0,virtio-net -l com1,stdio \
            -F ${path.join(baseDir, 'hyperkit.pid')} \
            -f kexec,${kernelPath},${initrdPath},${cmdline} \
            2>&1 >> ${hyperLog} &
        `;
        console.log(cmd);
        sudo.exec(cmd, sudoOpts, err => {
            if (err) throw err;
        });

        // TODO fix SSH info
        // let sshInfo = await this.getSSHConfig(name);
        // console.log(`ssh -i ${sshInfo.private_key} ${sshInfo.user}@${sshInfo.hostname} -p ${sshInfo.port} -o StrictHostKeyChecking=no`);
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
                sudo.exec(`kill -9 ${pid}`, sudoOpts, () => undefined);
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

        return fs.statSync(path.join(dir, 'initrd')).size;
    }

    async list() {
        return fs.readdirSync(path.join(slimdir, 'hyperkit'))
            .filter(name => !(/(^|\/)\.[^/.]/g).test(name))
            .map((name, index) => ({ id: index, name }));
    }

    async getSSHConfig(name) {
        return {user: 'root', port: '22', host: name, hostname: '127.0.0.1', private_key: privateKey};
    }
}

module.exports = new Hyperkit();
