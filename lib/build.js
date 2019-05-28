const child  = require('child_process');
const Docker = require('dockerode');
const fs     = require('fs-extra');
const path   = require('path');
const tar    = require('tar');

const { info, ok } = require('./logger');

const env = require('./env');

const { slimdir, scriptdir } = env.vars();

const docker = new Docker();

async function build(context) {
    let { provider, buildPath, outputDir, dockerOpts } = context;

    let exportDir = path.join(slimdir, 'slim-vm');
    await fs.emptyDir(exportDir);

    info('building docker image');
    await buildImage(buildPath, dockerOpts);

    info('exporting docker filesystem');
    await exportImage('slim-vm', exportDir);

    info('creating initrd');
    await fs.move(path.join(exportDir, 'vmlinuz'), path.join(slimdir, 'vmlinuz'), { overwrite: true });
    child.execSync(`find . | cpio -o -H newc 2>/dev/null | gzip > ${path.join(slimdir, 'initrd')}`, {cwd: exportDir, stdio: 'inherit'});

    switch (provider) {
        case 'hyperkit':
            throw new Error('Hyperkit is not yet supported');
        case 'kvm':
            info('copying initrd and vmlinuz');
            await fs.copy(path.join(slimdir, 'vmlinuz'), path.join(outputDir, 'vmlinuz'));
            await fs.copy(path.join(slimdir, 'initrd'), path.join(outputDir, 'initrd'));
            break;
        case 'virtualbox':
        default:
            info('creating microkernel');
            await buildIso(path.join(outputDir, 'slim.iso'));
            break;
    }

    ok('success!');
}

async function buildIso(outputPath) {
    let isoDir = path.join(slimdir, 'slim-iso')
    let bootDir = path.join(isoDir, 'boot');
    let isolinuxDir = path.join(isoDir, 'isolinux');

    await Promise.all([
        fs.emptyDir(isoDir),
        fs.emptyDir(bootDir),
        fs.emptyDir(isolinuxDir)
    ]);

    await fs.copy(path.join(scriptdir, 'scripts', 'syslinux'), isolinuxDir);
    await fs.copy(path.join(slimdir, 'vmlinuz'), path.join(bootDir, 'vmlinuz'));
    await fs.copy(path.join(slimdir, 'initrd'), path.join(bootDir, 'initrd'));

    child.execSync(`
        mkisofs -o ${outputPath} \
        -b isolinux/isolinux.bin \
        -c isolinux/boot.cat \
        -no-emul-boot -boot-load-size 4 -boot-info-table \
        -V slim -J -R ${isoDir}`, {stdio: 'inherit'});
    child.execSync(`ls -la ${outputPath}`, {stdio: 'inherit'});
}

async function buildImage(dockerfilePath, dockerOpts) {
    if (!fs.existsSync(path.join(dockerfilePath, 'Dockerfile'))) throw new Error(`Expected Dockerfile in ${dockerfilePath}`);

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
