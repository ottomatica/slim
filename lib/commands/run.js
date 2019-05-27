const { error } = require('../logger');

const env    = require('../env');
const images = require('../images');
const micro  = require('../micro');

const { registry } = env.vars();

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
        }
    });
};

exports.handler = async argv => {
    const { image, cpus, memory, name } = argv;

    if (await images.exists(image, registry)) {
        let info = await images.info(image, registry).catch(e => error(e));

        await micro.create(name, registry, {
            attach_iso: image,
            cpus: cpus || info.cpus,
            mem: memory || info.memory
        }).catch(e => error(e));
    } else {
        error(`${image} image not found.`);
        process.exit(1);
    }
};
