const { error, ok } = require('../logger');

const { providers } = require('../providers');
const { providerArg } = require('../args');

exports.command = 'health <name>';
exports.desc = 'Check the health of a vm';

exports.builder = yargs => {
    yargs.options({
        provider: providerArg
    });
};

exports.handler = async argv => {
    let { name } = argv;
    const { provider } = argv;

    const result = await providers[provider].health(name);
    if (result) {
        ok(`VM ${name} is online`)
    } else {
        error(`VM ${name} is offline`)
    }
};