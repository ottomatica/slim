#! /usr/bin/env node
const path   = require('path');
const fs     = require('fs-extra');
const yargs  = require('yargs');
const chalk  = require('chalk');
const child  = require('child_process');
const yaml   = require('js-yaml');
const tar    = require('tar');
const os     = require('os');

const Docker = require('dockerode');
const Micro  = require('./lib/micro');
const Env    = require('./lib/env');
const Images = require('./lib/images');

// Environment reset/sanity check
// - prereqs
// - permissions
// - required files

const docker = new Docker();

const error = e => console.error(chalk.red(e));
const warning = m => console.log(chalk.orange(m));
const info = m => console.log(chalk.yellow(m));
const ok = m => console.log(chalk.green(m));

// directories
const syslinux = `${__dirname}/scripts/syslinux`;
const workdir = `${os.homedir()}/.slim`;
const slimvm = `${workdir}/slim-vm`;
const slimiso = `${workdir}/slim-iso`;
const boot = `${slimiso}/boot`;
const isolinux = `${slimiso}/isolinux`;
const initrd = `${boot}/initrd`;
const vmlinuz = `${boot}/vmlinuz`;

(async () => {

    let env = new Env();
    await env.setup();
    let {registery} = env.check().vars();

    // Create VM
    yargs.command('run <name> <image>', 'Provision a new micro kernel', (yargs) => { }, async (argv) => {
        let image = argv.image;

        let micro = new Micro();
        const images = new Images();

        if (await images.exists(image, registery)) {
            let info = await images.info(image, registery).catch(e => log(e));

            let cpus = argv.cpus || info.cpus;
            let memory = argv.memory || info.memory;

            await micro.create(argv.name, registery, { attach_iso: image, cpus: cpus, mem: memory }).catch(e => log(e));
        }

        else {
            error(`${argv.image} image not found.`);
            process.exit(1);
        }
    }).option('memory', {
        alias: 'm',
        describe: 'Choose memory size (MB)'
    }).option('cpus', {
        alias: 'c',
        describe: 'number of cpus (default 1)'
    });

    // Images
    yargs.command('images', 'List available images', (yargs) => { }, async (argv) => {

        let images = new Images();
        let table = await images.list(registery);
        let transformed = table.reduce((table, {image, ...x}) => { table[image] = x; return table}, {})

        console.table(transformed);
    });

    yargs.command('delete <vm|image> <name>', 'Delete a micro kernel image or vm', (yargs) => { }, async (argv) => {
        if (argv.vm === 'vm') {
            let micro = new Micro();
            const name = argv.name;
            if (name) await micro.delete(name);
        } else if (argv.image === 'image') {
            const images = new Images();

            if (await images.exists(argv.name, registery)) {
                await fs.remove(path.resolve(registery, argv.name));
            }

            else {
                error(`${argv.name} image not found.`);
            }
        }
    });

    yargs.command('build [path]', 'Build a new micro kernel', (yargs) => { }, async (argv) => {

        let buildPath = argv.path || path.join(__dirname,'images/alpine3.8-runc-ansible');
        buildPath = path.resolve(buildPath);

        let name = path.basename(buildPath);
        let outputPath = path.join(registery, name, 'slim.iso');
        let infoPath = path.join(buildPath, 'info.yml');


        if( !fs.existsSync(infoPath)) { error(`Expected required configuration file missing: ${infoPath}`); return; }

        let info = await yaml.safeLoad(fs.readFileSync(infoPath));
        let pkgs = "";
        // Fetch required base images (overwrites buildPath)
        if( info.base_repository )
        {
            let baseRepoPath = await env.cloneOrPull(info.base_repository);
            if( info.base_directory)
            {
                let baseDir = path.join(baseRepoPath, info.base_directory);
                // We will build based on base repository contents.
                buildPath = baseDir
                if( info.base_args )
                {
                    pkgs = info.base_args.PKGS;
                }
            }
        }
        // Will build base on provided Dockerfile in $buildPath
        else
        {
            if( !fs.existsSync(buildPath)) { error(`path does not exist: ${buildPath}`); return; }
            if( !fs.existsSync(path.join(buildPath, 'Dockerfile'))) { error(`Expected Dockerfile does not in this path: ${buildPath}`); return; }
        }

        let pubkey = fs.readFileSync(path.join(__dirname, 'scripts', 'keys', 'baker.pub')).toString();

        let dockerOpts = {
            nocache: !argv.cache,
            buildargs: {
                'SSHPUBKEY': pubkey,
                'PKGS': pkgs
            }
        }

        fs.ensureDirSync(path.dirname(outputPath));

        await buildVM(buildPath, outputPath, dockerOpts);

        // Copy over to output directory
        fs.copyFileSync(infoPath, path.join(path.dirname(outputPath),'info.yml'));

    })
    .option('cache', {
        boolean: true,
        default: true,
        description: 'whether to cache images during docker build'
    });

    // Turn on help and access argv
    yargs.help().argv;

})();

async function buildVM(dockerfilePath, outputPath, dockerOpts) {
    await Promise.all([
        fs.ensureDir(workdir),
        fs.emptyDir(slimvm),
        fs.emptyDir(slimiso),
        fs.emptyDir(boot)
    ]);

    await fs.copy(`${syslinux}`, `${isolinux}`);

    info('building docker image');
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

    info('exporting docker filesystem');
    const container = await docker.createContainer({ Image: 'slim-vm', Cmd: ['sh'] });

    const contents = await container.export();
    await new Promise((resolve, reject) => {
        contents.pipe(
            tar.x({ C: slimvm })
               .on('close', resolve)
               .on('error', err => reject(err))
        );
    });
    container.remove().catch(e => undefined);

    // move kernel
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

    ok('success!');
}
