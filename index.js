#! /usr/bin/env node
const yargs = require('yargs');
const chalk = require('chalk');

const Micro = require('./lib/micro');

// Register run command
yargs.command('build', 'build', (yargs) => { }, async (argv) => {

    console.log('zzzß')
    let micro = new Micro();
    await micro.create("micro",{}).catch( e => console.log(e));

});

// Turn on help and access argv
yargs.help().argv;
