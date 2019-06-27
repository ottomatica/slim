const fs   = require('fs-extra');
const path = require('path');

const { error, ok } = require('../logger');

const env    = require('../env');
const { providers } = require('../providers');
const { providerArg } = require('../args');

const { registry } = env.vars();

exports.command = 'stop <name>';
exports.desc = 'Stop a running instance of a microkernel vm';

exports.builder = yargs => {
    yargs.options({
        provider: providerArg
    });
};

exports.handler = async argv => {
    const { name, provider } = argv;

    try {
        await providers[provider].stop(name);
        ok(`${name} stopped`);
    }
    catch (e) {
        error(e);
    }
};
