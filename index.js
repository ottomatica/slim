#! /usr/bin/env node
const yargs = require('yargs');
const chalk = require('chalk');

const Micro = require('./lib/micro');

// Build
yargs.command('run', 'Provision a new micro kernel', (yargs) => { }, async (argv) => {
    let micro = new Micro();
    await micro.create("micro",{}).catch( e => console.log(e));
});

// Turn on help and access argv
yargs.help().argv;
