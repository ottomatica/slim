#! /usr/bin/env node
const path  = require('path');
const fs    = require('fs');
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
        await micro.create(argv.name, registery, {attach_iso:argv.image}).catch( e => console.log(e));
    });

    // Images
    yargs.command('images', 'List available images', (yargs) => { }, async (argv) => {

        let images = new Images();
        let table = await images.list(registery);
        let transformed = table.reduce((table, {image, ...x}) => { table[image] = x; return table}, {})

        console.table(transformed);
    });

    yargs.command('build [path]', 'Build a new micro kernel', (yargs) => { }, async (argv) => {

        let buildPath = argv.path || path.join(__dirname,'images/alpine3.8-runc-ansible');
        buildPath = path.resolve(buildPath);

        let name = path.basename(buildPath);
        let outputPath = path.join(registery, name, 'slim.iso');
        let baseIso = path.join(registery, name, 'base.iso');
        let infoPath = path.join(buildPath, 'info.yml');

        if( !fs.existsSync(buildPath)) { console.log(`path does not exist: ${buildPath}`); return; }
        if( !fs.existsSync(path.join(buildPath, 'Dockerfile'))) { console.log(`Expected Dockerfile does not in this path: ${buildPath}`); return; }
        if( !fs.existsSync(infoPath)) { console.log(`Expected required configuration file missing: ${infoPath}`); return; }

        // Fetch required base images
        let info = await yaml.safeLoad(fs.readFileSync(infoPath));

        if( !fs.existsSync( path.dirname(outputPath)) )
        {
            fs.mkdirSync(path.dirname(outputPath));
        }
        let slimDir = __dirname;
        child.execSync(`${slimDir}/scripts/extract-fs.sh ${buildPath}`, {stdio: 'inherit'});
        child.execSync(`${slimDir}/scripts/make-iso.sh ${outputPath} ${baseIso}`, {stdio: 'inherit'})

        // Copy over to output directory
        fs.copyFileSync(infoPath, path.join(path.dirname(outputPath),'info.yml'));

    });


    // Turn on help and access argv
    yargs.help().argv;

})();



