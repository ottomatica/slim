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
        let micro = new Micro();
        const images = new Images();

        if (await images.exists(argv.image, registery)) {
            await micro.create(argv.name, registery, { attach_iso: argv.image, mem: argv.memory }).catch(e => console.log(e));
        }

        else {
            console.error(`${argv.image} image not found.`);
            process.exit(1);
        }
    }).option('memory', {
        alias: 'm',
        describe: 'Choose memory size (MB)'
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

    yargs.command('build [name]', 'Build a new micro kernel', (yargs) => { }, async (argv) => {

        let baseDir = __dirname;

        // default to alpine3.8-base
        let name = argv.name || 'alpine3.8-base';
        // if user's don't specify their own image path, use `slim dir`/images
        let imageBase = argv.images || path.join(baseDir, 'images');

        let imagePath = path.join(imageBase, name);
        let outputPath = path.join(registery, name, 'slim.iso');
        let infoPath = path.join(imagePath, 'info.yml');

        if( !fs.existsSync(imagePath) ) { console.log(`Image ${name} does not exist`); return; }
        if( !fs.existsSync(infoPath)) { console.log(`Expected required configuration file missing: ${infoPath}`); return; }

        // Fetch required base images
        let cache = argv.cache;
        let pubkey = fs.readFileSync(path.join(baseDir, 'scripts', 'keys', 'baker.pub'));

        let dockerOpts = `--no-cache=${!cache} --build-arg SSHPUBKEY="${pubkey}"`;

        if( !fs.existsSync( path.dirname(outputPath)) )
        {
            fs.mkdirSync(path.dirname(outputPath));
        }

        try {
            await dockerBuild(imageBase, name, dockerOpts);
        } catch (e) {
            console.log(`failed to build docker image: ${e}`);
            return;
        }

        child.execSync(`${baseDir}/scripts/extract-fs.sh ${name}`, {stdio: 'inherit'});
        child.execSync(`${baseDir}/scripts/make-iso.sh ${outputPath} ${name}`, {stdio: 'inherit'})

        // Copy over to output directory
        fs.copyFileSync(infoPath, path.join(path.dirname(outputPath),'info.yml'));

    })
    .option('cache', {
        boolean: true,
        default: true,
        description: 'whether to cache images during docker build'
    })
    .option('images', {
        alias: 'i',
        description: 'specify a path to the image store'
    });

    // Turn on help and access argv
    yargs.help().argv;

})();

async function dockerBuild(imageBase, name, args) {
    let imagePath = path.join(imageBase, name);
    let infoPath = path.join(imagePath, 'info.yml');
    let dockerfilePath = path.join(imagePath, 'Dockerfile');

    if (!fs.existsSync(imagePath)) { throw new Error(`path does not exist: ${imagePath}`); }
    if (!fs.existsSync(dockerfilePath)) { throw new Error(`expected Dockerfile missing: ${imagePath}`); }
    if (!fs.existsSync(infoPath)) { throw new Error(`expected configuration file missing: ${infoPath}`); }

    let info = await yaml.safeLoad(fs.readFileSync(infoPath));
    let dockerDepends = info.depends;

    // recursively build dependency images
    if (dockerDepends) { await dockerBuild(imageBase, dockerDepends, args); }

    console.log(`building image for ${name}`);
    child.execSync(`docker build ${args} -t ${name} ${imagePath}`, { stdio: 'inherit' });
}
