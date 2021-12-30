const child  = require('child_process');
const Docker = require('dockerode');
const fs     = require('fs-extra');
const path   = require('path');
const tar    = require('tar');

const env = require('./env');

const { info, ok } = require('./logger');
const { slimdir, scriptdir } = env.vars();

const docker = new Docker();

const formatSteps = {
    'raw': [dockerBuild, dockerExport, rawBuild, cleanup],
    'iso': [dockerBuild, dockerExport, rawBuild, isoBuild, cleanup],
    'qcow2': [dockerBuild, dockerExport, rawBuild, isoBuild, qcowBuild, cleanup]
};

async function build(context) {
    let { format } = context;

    // use a set in case there are overlaps between steps
    let steps = new Set(formatSteps[format]);
    // add all additional steps for the requested formats
    format.forEach(f => formatSteps[f].forEach(s => steps.add(s)));

    // run each step in order
    for (let s of steps) {
        await s(context);
    }

    ok('success!');
}

async function dockerBuild(context) {
    info('building docker image');

    let { buildPath, dockerOpts } = context;

    if (!fs.existsSync(path.join(buildPath, 'Dockerfile')))
        throw new Error(`Expected Dockerfile in ${buildPath}`);

    const image = await docker.buildImage({ context: buildPath }, {
        t: 'slim-vm',
        ...dockerOpts
    });
    await new Promise((resolve, reject) => {
        docker.modem.followProgress(
            image,
            (err, res) => err ? reject(err) : resolve(res),
            (ev) => { if( ev && ev.stream ) { process.stdout.write(ev.stream) } }
        );
    });
}

async function dockerExport() {
    info('exporting docker filesystem');

    let image = 'slim-vm';
    let exportDir = path.join(slimdir, image);
    await fs.emptyDir(exportDir);

    const container = await docker.createContainer({ Image: image, Cmd: ['sh'] });

    const contents = await container.export();
    try {
        await new Promise((resolve, reject) => {
            contents.pipe(
                tar.x({ C: exportDir })
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

async function rawBuild(context) {
    info('creating rootfs');

    let { outputDir, formatOptions } = context;
    let vmDir = path.join(slimdir, 'slim-vm');

    // Move out kernel and initrd to be seperate. Copy into outputDir.
    // Note, a copy is left in case another stage needs to repackage together (iso, etc.)
    if( fs.existsSync(path.join(vmDir, 'vmlinuz')) ) {
        await fs.move(path.join(vmDir, 'vmlinuz'), path.join(slimdir, 'vmlinuz'), { overwrite: true });
        await fs.copy(path.join(slimdir, 'vmlinuz'), path.join(outputDir, 'vmlinuz'));
    }
    if( fs.existsSync(path.join(vmDir, 'initrd')) ) {
        await fs.move(path.join(vmDir, 'initrd'), path.join(slimdir, 'initrd'), { overwrite: true });
        await fs.copy(path.join(slimdir, 'initrd'), path.join(outputDir, 'initrd'));
    }

    await cpioPack( vmDir, path.join(slimdir, 'rootfs'), formatOptions.zip);
    await fs.copy(path.join(slimdir, 'rootfs'), path.join(outputDir, 'rootfs'));
}


async function cpioPack(vmDir, output, zip ) {
    // child.execSync(`find . | cpio -o -H newc 2>/dev/null > ${path.join(slimdir, 'rootfs')}`,
    //     {cwd: vmDir, stdio: 'inherit'});
    // return;
    const cpio = require('cpio-fs');
    const fs = require('fs');
    const zlib = require('zlib');
    const pass = new require('stream').PassThrough();
 
    let zipOrPass = zip ? zlib.createGzip() : pass;
    return new Promise( (resolve, reject) => {
        cpio.pack(vmDir, {format: 'newc'})
            .pipe( zipOrPass )
            .pipe( fs.createWriteStream(output)).on('finish', () => 
            {
                resolve();
            }) 
    });
}

async function isoBuild(context) {
    info('building iso');


    const makeiso = require('./tools/makeiso');

    let { outputDir } = context;
    let outputPath = path.join(outputDir, 'slim.iso');

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
    await fs.copy(path.join(slimdir, 'rootfs'), path.join(bootDir, 'rootfs'));

    await makeiso.createBootableIso(outputPath, 
        'slim',
        isoDir
    );
}

async function qcowBuild(context) {
    info('building qcow2 image');

    let { outputDir } = context;

    child.execSync(`qemu-img convert -O qcow2 slim.iso slim.qcow2`,
        {cwd: outputDir, stdio: 'inherit'});
}

async function cleanup(context) {
    info('cleaning up...');

    let { format, outputDir } = context;

    // If raw build, clean up intermediate step in slim directory.
    if( format.indexOf("raw") >= 0 ) {
        await fs.remove(path.join(slimdir, 'rootfs'));
        await fs.remove(path.join(slimdir, 'vmlinuz'));
        await fs.remove(path.join(slimdir, 'initrd'));
    }

}

module.exports = build;
