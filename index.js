#! /usr/bin/env node
const yargs = require('yargs');
const chalk = require('chalk');
const child = require('child_process');

const Micro = require('./lib/micro');

// Environment reset/sanity check
// - prereqs
// - permissions
// - required files

// Create VM
yargs.command('run', 'Provision a new micro kernel', (yargs) => { }, async (argv) => {
    let micro = new Micro();
    await micro.create("micro",{}).catch( e => console.log(e));
});

// Images
yargs.command('images', 'List available images', (yargs) => { }, async (argv) => {

    let table = [{image: 'ansible-alpine', description: 'Light-weight configuration server with ansible'}]
    let transformed = table.reduce((table, {image, ...x}) => { table[image] = x; return table}, {})

    console.table(transformed);
});

yargs.command('build', 'Build a new micro kernel', (yargs) => { }, async (argv) => {

    child.execSync(`scripts/extract-fs.sh ${__dirname}/images/alpine3.8-ansible/`);
    child.execSync('scripts/make-iso.sh', {stdio: 'inherit'})
});


// Turn on help and access argv
yargs.help().argv;
