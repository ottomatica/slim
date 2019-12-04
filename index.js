#!/usr/bin/env node
const yargs       = require('yargs');
const storage     = require('node-persist');
const { version } = require('./package.json');

const { check } = require('./lib/dependencies');
const env = require('./lib/env');

// Environment reset/sanity check
// - prereqs
// - permissions
// - required files
(async () => {
    await env.setup();
    const { persistdir } = env.vars();
    await storage.init({dir: persistdir});

    yargs
        .middleware(check)
        .commandDir('./lib/commands')
        .version()
        .epilog(version ? `Version: ${version}`: '')
        .demandCommand(1, 'Did you forget to specify a command?')
        .recommendCommands()
        .showHelpOnFail(false, 'Specify --help for available options')
        .strict(true)
        .help()
        .wrap(yargs.terminalWidth())
        .argv
})();
