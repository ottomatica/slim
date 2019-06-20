const { error } = require('../logger');

const images = require('../images');
const { providers } = require('../providers');
const { providerArg } = require('../args');

exports.command = 'run <name> <image>';
exports.desc = 'Provision a new micro kernel';

exports.builder = yargs => {
    yargs.options({
        cpus: {
            alias: 'c',
            describe: 'number of cpus (default 1)',
            type: 'number'
        },
        memory: {
            alias: 'm',
            describe: 'choose memory size in MB (default 1024)',
            type: 'number'
        },
        provider: providerArg
    });
};

exports.handler = async argv => {
    const { image, cpus, memory, name, provider } = argv;

    if (!await images.exists(image)) {
        error(`${image} image not found`);
        return;
    }

    let info = await images.info(image).catch(e => error(e));
    if (info.providers.indexOf(provider) == -1) {
        error(`Please rebuild ${image} for ${provider}`);
        return;
    }

    await providers[provider].create(name, {
        image: image,
        cpus: cpus || info.cpus,
        mem: memory || info.memory
    }).catch(e => error(e));
};
