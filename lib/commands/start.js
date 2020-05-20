const { error, ok } = require('../logger');

const { providers } = require('../providers');
const { providerArg } = require('../args');


exports.command = 'start <name>';
exports.desc = 'Start a microkernel vm that has been shutdown';

exports.builder = yargs => {
    yargs.options({
        provider: providerArg
    });
};

exports.handler = async argv => {
    const { name, provider } = argv;

    try {
        await providers[provider].start(name);
        ok(`${name} started`);
    }
    catch (e) {
        error(e);
    }
};
