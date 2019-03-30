#! /usr/bin/env node
const path  = require('path');
const fs    = require('fs');
const yargs = require('yargs');
const chalk = require('chalk');
const child = require('child_process');

const Micro = require('./lib/micro');
const Env   = require('./lib/env');
const Images= require('./lib/images');

// Environment reset/sanity check
// - prereqs
// - permissions
// - required files
const {registery}  = new Env().setup().check().vars();

// Create VM
yargs.command('run <name> <image>', 'Provision a new micro kernel', (yargs) => { }, async (argv) => {
    let micro = new Micro();
    await micro.create(argv.name, registery, {attach_iso:argv.image}).catch( e => console.log(e));
});

// Images
yargs.command('images', 'List available images', (yargs) => { }, async (argv) => {

    let images = new Images();
    let table = images.list(registery);
    let transformed = table.reduce((table, {image, ...x}) => { table[image] = x; return table}, {})

    console.table(transformed);
});

yargs.command('build [path]', 'Build a new micro kernel', (yargs) => { }, async (argv) => {

    let buildPath = argv.path || path.join(__dirname,'images/alpine3.8-runc-ansible');
    buildPath = path.resolve(buildPath);

    if( !fs.existsSync) { console.log(`path does not exist: ${buildPath}`); return; }

    let name = path.basename(buildPath);
    let outputPath = path.join(registery, name, 'slim.iso');
    let infoPath = path.join(buildPath, 'info.txt');

    if( !fs.existsSync( path.dirname(outputPath)) )
    {
        fs.mkdirSync(path.dirname(outputPath));
    }
    child.execSync(`scripts/extract-fs.sh ${buildPath}`);
    child.execSync(`scripts/make-iso.sh ${outputPath}`, {stdio: 'inherit'})

    // If infoPath exists, copy over to output
    if( fs.existsSync( infoPath ) )
    {
        fs.copyFileSync(infoPath, path.join(path.dirname(outputPath),'info.txt'));
    }

});


// Turn on help and access argv
yargs.help().argv;
