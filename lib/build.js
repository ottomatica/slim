const child  = require('child_process');
const Docker = require('dockerode');
const fs     = require('fs-extra');
const path   = require('path');
const tar    = require('tar');

const env = require('./env');

const { info, ok, error } = require('./logger');
const { slimdir, scriptdir } = env.vars();

const docker = new Docker();

const formatSteps = {
    'vhd': [dockerBuild, dockerExport, buildEfiImage, makeVhd],
    'raw': [dockerBuild, dockerExport, buildRootfsImage, cleanup],
    'initrd-m1': [dockerBuild, dockerExtract, uncompressKernel, cpioPack],
    'initrd': [dockerBuild, dockerExtract, cpioPack],
    'special': [dockerBuild, dockerExport, buildRootfsImage, dockerExtract, uncompressKernel, cpioPack],
    'iso': [dockerBuild, dockerExtract, uncompressKernel, rawExtract, buildRootfsImage, isoBuild, cleanup],
    'qcow2': [dockerBuild, dockerExtract, uncompressKernel, rawExtract, buildRootfsImage, isoBuild, qcowBuild, cleanup]
};

async function build(context) {
    let { format, dockerOpts, outputDir } = context;

    ok( `Starting build for ${format} format(s) using ${JSON.stringify(dockerOpts)}` );

    await fs.emptyDir( outputDir );

    // use a set in case there are overlaps between steps
    let steps = new Set(formatSteps[format]);
    // add all additional steps for the requested formats
    format.forEach(f => formatSteps[f].forEach(s => steps.add(s)));

    // run each step in order
    for (let s of steps) {
        try {
            await s(context);
        } catch (err) {
            error( err );
            return;
        }
    }

    ok('success!');
}

async function uncompressKernel(context) {
    info('Uncompressing compressed kernel');

    let vmDir = path.join(slimdir, 'slim-vm');

    let { outputDir } = context;

    return new Promise( async (resolve, reject) => {

        // Rename vmlinuz => vmlinuz.gz
        await fs.move(path.join(vmDir, 'vmlinuz'), path.join(vmDir, 'vmlinuz.gz'), { overwrite: true });

        const zlib = require('zlib');
        const unzip = zlib.createGunzip();

        // Unzip
        const inp = fs.createReadStream(path.join(vmDir, 'vmlinuz.gz'));  
        const out = fs.createWriteStream(path.join(vmDir, 'vmlinuz'));
        out.on('finish', () => 
        {
            fs.removeSync( path.join(vmDir, 'vmlinuz.gz') );
            console.log("Uncompressed kernel");
            resolve();
        });
        out.on('error', (err) => {
            reject( err );
        })

        inp.pipe(unzip).pipe(out);
    })


}

async function dockerBuild(context) {
    info('building docker image');

    let { buildPath, dockerOpts } = context;

    if (!fs.existsSync(path.join(buildPath, 'Dockerfile')))
        throw new Error(`Expected Dockerfile in ${buildPath}`);

    let stream = await docker.buildImage({ context: buildPath }, {
        t: 'slim-vm',
        ...dockerOpts,
    });
    return new Promise((resolve, reject) => {
        docker.modem.followProgress(stream, (err, res) => err ? reject(err) : resolve(res),
        (ev) => {
            if( ev.error  ) {
                return reject( ev.error );
            }
            if( ev.stream ) 
            { 
                process.stdout.write(ev.stream)
            } 
        });
    });
}


async function dockerExtract(context) {
    info('exporting docker filesystem');

    let image = 'slim-vm';
    let vmDir = path.join(slimdir, image);
    await fs.emptyDir(vmDir);


    const container = await docker.createContainer({ Image: image, Cmd: ['sh'] });

    const contents = await container.export();
    try {
        await new Promise((resolve, reject) => {
            contents.pipe(
                tar.x({ C: vmDir })
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

async function dockerExport(context) {
    info('exporting docker filesystem');

    let image = 'slim-vm';
    let exportDir = path.join(slimdir, image);
    await fs.emptyDir(exportDir);

    let { outputDir } = context;


    const container = await docker.createContainer({ Image: image, Cmd: ['sh'] });

    const contents = await container.export();
    try {
        await new Promise((resolve, reject) => {
            contents.pipe( 
                fs.createWriteStream( path.join(outputDir, 'rootfs.tar'))
                .on('finish', () => 
                {
                    resolve();
                })
                .on('error', err => reject(err) )
            );
        });
    } catch (e) {
        throw e;
    } finally {
        container.remove().catch(() => undefined);
    }
}

async function buildEfiImage(context) {
    info('saving rootfs as uefi bootable raw image');

    let { outputDir, formatOptions } = context;
    let vmDir = path.join(slimdir, 'slim-vm');

    const rootFs = require("./tools/rootfs");
    await rootFs.asEfi(
        outputDir,
        outputDir,
        formatOptions.size
    );

}

async function buildRootfsImage(context) {
    info('saving rootfs as ext4 image');

    let { outputDir, formatOptions } = context;
    let vmDir = path.join(slimdir, 'slim-vm');

    const rootFs = require("./tools/rootfs");
    await rootFs.asExt4(
        outputDir,
        outputDir,
        formatOptions.size
    );

}

async function moveBoot(context) {
    info('moving vmlinuz and initrd to /boot');

    let vmDir = path.join(slimdir, 'slim-vm');

    await fs.move(path.join(vmDir, 'vmlinuz'), path.join(vmDir, 'boot', 'vmlinuz'), { overwrite: true });
    await fs.move(path.join(vmDir, 'initrd'), path.join(vmDir, 'boot', 'initrd'), { overwrite: true });

}

async function makeVhd(context) {
    info('making vhd');

    let { outputDir } = context;

    let input = path.join(outputDir, 'rootfs')
    let output = path.join(outputDir, "rootfs.vhd");

    const vhd = require("./tools/vhd");
    await vhd.makeVhd( input, output  );
}


async function rawExtract(context) {
    info('extracting rootfs');

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

    // This should only be done for manual initrd builds... pending...new pipeline.
    // await cpioPack();
    // await fs.copy(path.join(slimdir, 'rootfs'), path.join(outputDir, 'rootfs'));
}


async function cpioPack(context) {
    info( "Packing initrd as compressed cpio archive" )
    // child.execSync(`find . | cpio -o -H newc 2>/dev/null > ${path.join(slimdir, 'rootfs')}`,
    //     {cwd: vmDir, stdio: 'inherit'});
    // return;
    let { formatOptions, outputDir } = context;

    let vmDir = path.join(slimdir, 'slim-vm');
    let output = path.join(outputDir, 'initrd')
    let zip = true;

    // Move kernel out
    await fs.move(path.join(vmDir, 'vmlinuz'), path.join(outputDir, 'vmlinuz'), { overwrite: true });
    console.log("Moved kernel into ", outputDir);

    const cpio = require('cpio-fs');
    const pack = cpio.pack(vmDir, {format: 'newc'});

    const zlib = require('zlib');
    const pass = new require('stream').PassThrough();
    const zipOrPass = zip ? zlib.createGzip() : pass;

    const outputStream = fs.createWriteStream(output);

    return new Promise( (resolve, reject) => {

        let onError = (err) => {
            error( err.message );
            reject(err);
        };

        pack.on('error', onError );
        zipOrPass.on('error', onError );
        outputStream.on('error', onError )
        outputStream.on('finish', () => 
        {
            console.log("Finished cpio pack");
            resolve();
        });

        pack.pipe( zipOrPass )
        .pipe( outputStream );

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
