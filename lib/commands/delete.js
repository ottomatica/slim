const fs   = require('fs-extra');
const path = require('path');

const { error, ok } = require('../logger');

const env    = require('../env');
const { providers } = require('../providers');
const { providerArg } = require('../args');

const { registry } = env.vars();

exports.command = 'delete <vm|image> <name>';
exports.desc = 'Delete a microkernel image or vm';

exports.builder = yargs => {
    yargs.options({
        provider: providerArg
    });
};

exports.handler = async argv => {
    // both vm and image have the same value
    const { vm: command, name, provider } = argv;

    try {
        switch (command) {
            case 'vm':
                await providers[provider].delete(name);
                break;
            case 'image':
                await fs.remove(path.resolve(registry, name));
                break;
        }
        ok(`${name} deleted`);
    } catch (e) {
        error(e);
    }
};
