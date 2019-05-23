#! /usr/bin/env node
const path  = require('path');
const fs    = require('fs-extra');
const yargs = require('yargs');
const chalk = require('chalk');
const child = require('child_process');
const yaml  = require('js-yaml');

const Micro = require('./lib/micro');
const Env   = require('./lib/env');
const Images= require('./lib/images');

// Environment reset/sanity check
// - prereqs
// - permissions
// - required files


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
            let info = await images.info(image, registery).catch(e => console.log(e));

            let cpus = argv.cpus || info.cpus;
            let memory = argv.memory || info.memory;

            await micro.create(argv.name, registery, { attach_iso: image, cpus: cpus, mem: memory }).catch(e => console.log(e));
        }

        else {
            console.error(`${argv.image} image not found.`);
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
                console.error(`${argv.name} image not found.`);
            }
        }
    });

    yargs.command('build [path]', 'Build a new micro kernel', (yargs) => { }, async (argv) => {

        let buildPath = argv.path || path.join(__dirname,'images/alpine3.8-runc-ansible');
        buildPath = path.resolve(buildPath);

        let name = path.basename(buildPath);
        let outputPath = path.join(registery, name, 'slim.iso');
        let infoPath = path.join(buildPath, 'info.yml');


        if( !fs.existsSync(infoPath)) { console.log(`Expected required configuration file missing: ${infoPath}`); return; }

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
            if( !fs.existsSync(buildPath)) { console.log(`path does not exist: ${buildPath}`); return; }
            if( !fs.existsSync(path.join(buildPath, 'Dockerfile'))) { console.log(`Expected Dockerfile does not in this path: ${buildPath}`); return; }
        }
  
        let cache = argv.cache;
        let dockerOpts = `--no-cache=${!cache}`;

        if( !fs.existsSync( path.dirname(outputPath)) )
        {
            fs.mkdirSync(path.dirname(outputPath));
        }
        let slimDir = __dirname;
        child.execSync(`${slimDir}/scripts/extract-fs.sh ${buildPath} "${pkgs}" ${dockerOpts}`, {stdio: 'inherit'});
        child.execSync(`${slimDir}/scripts/make-iso.sh ${outputPath}`, {stdio: 'inherit'})

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
