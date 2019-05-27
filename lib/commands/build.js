const build = require('../build');

exports.command = 'build [path]';
exports.desc = 'Build a new microkernel';

exports.builder = yargs => {
    yargs.options({
        cache: {
            default: true,
            description: 'whether to cache images during docker build',
            type: 'boolean'
        }
    })
};

exports.handler = async argv => {
    const { path, cache } = argv;

    await build(path, cache);
};
