const child  = require('child_process');
const Docker = require('dockerode');
const fs     = require('fs-extra');
const os     = require('os');
const p      = require('path');
const tar    = require('tar');
const yaml   = require('js-yaml');

const { error, info, ok } = require('./logger');

const env = require('./env');

const { registry } = env.vars();

const docker = new Docker();

// directories
const syslinux = `${__dirname}/../scripts/syslinux`;
const workdir = `${os.homedir()}/.slim`;
const slimvm = `${workdir}/slim-vm`;
const slimiso = `${workdir}/slim-iso`;
const boot = `${slimiso}/boot`;
const isolinux = `${slimiso}/isolinux`;
const initrd = `${boot}/initrd`;
const vmlinuz = `${boot}/vmlinuz`;

async function build(path, cache) {
    let buildPath = p.resolve(path || p.join(__dirname, '..', 'images', 'alpine3.8-runc-ansible'));
    let name = p.basename(buildPath);
    let outputDir = p.join(registry, name);
    let outputPath = p.join(outputDir, 'slim.iso');
    let infoPath = p.join(buildPath, 'info.yml');

    fs.ensureDirSync(outputDir);

    if (!fs.existsSync(infoPath)) { error(`Expected required configuration file missing: ${infoPath}`); return; }
    fs.copyFileSync(infoPath, p.join(outputDir, 'info.yml'));

    let info = await yaml.safeLoad(fs.readFileSync(infoPath));
    let pkgs = '';

    if (info.base_repository) {
        let baseRepoPath = await env.cloneOrPull(info.base_repository);
        if (info.base_directory) {
            buildPath = p.join(baseRepoPath, info.base_directory);
            if (info.base_args) {
                pkgs = info.base_args.PKGS;
            }
        }
    } else {
        if (!fs.existsSync(buildPath)) { error(`Path does not exist: ${buildPath}`); return; }
        if (!fs.existsSync(p.join(buildPath, 'Dockerfile'))) { error(`Expected Dockerfile does not exist in this path: ${buildPath}`); return; }
    }

    let pubkey = fs.readFileSync(p.join(__dirname, '..', 'scripts', 'keys', 'baker.pub')).toString();

    let dockerOpts = {
        nocache: !cache,
        buildargs: {
            'SSHPUBKEY': pubkey,
            'PKGS': pkgs
        }
    };

    try {
        await makeIso(buildPath, dockerOpts, outputPath);
    } catch (e) {
        error(e);
    }

}

async function makeIso(dockerfilePath, dockerOpts, outputPath) {
    await Promise.all([
        fs.ensureDir(workdir),
        fs.emptyDir(slimvm),
        fs.emptyDir(slimiso),
        fs.emptyDir(boot)
    ]);

    info('building docker image');
    await buildImage(dockerfilePath, dockerOpts);

    info('exporting docker filesystem');
    await exportImage('slim-vm', slimvm);

    await fs.copy(`${syslinux}`, `${isolinux}`);
    await fs.move(`${slimvm}/vmlinuz`, vmlinuz);

    info('creating initrd');
    child.execSync(`find . | cpio -o -H newc | gzip > ${initrd}`, { cwd: slimvm });

    info('creating microkernel');
    child.execSync(`
        mkisofs -o ${outputPath} \
        -b isolinux/isolinux.bin \
        -c isolinux/boot.cat \
        -no-emul-boot -boot-load-size 4 -boot-info-table \
        -V slim -J -R ${slimiso}`,
        {stdio: 'inherit'});
    child.execSync(`ls -la ${outputPath}`, {stdio: 'inherit'});

    ok('success!');
}

async function buildImage(dockerfilePath, dockerOpts) {
    const image = await docker.buildImage({ context: dockerfilePath }, {
        t: 'slim-vm',
        ...dockerOpts
    });
    await new Promise((resolve, reject) => {
        docker.modem.followProgress(
            image,
            (err, res) => err ? reject(err) : resolve(res),
            ev => process.stdout.write(ev.stream)
        );
    });
}

async function exportImage(image, outdir) {
    const container = await docker.createContainer({ Image: image, Cmd: ['sh'] });

    const contents = await container.export();
    try {
        await new Promise((resolve, reject) => {
            contents.pipe(
                tar.x({ C: outdir })
                   .on('close', resolve)
                   .on('error', err => reject(err))
            );
        });
    } catch (e) {
        throw e;
    } finally {
        container.remove().catch(() => undefined);
    }
}

module.exports = build;
