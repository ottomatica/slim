const fs   = require('fs-extra');
const p    = require('path');
const yaml = require('js-yaml');

const { error } = require('../logger');

const build = require('../build');
const env   = require('../env');

const { pubkey } = env.vars();

exports.command = 'build [path]';
exports.desc = 'Build a new microkernel';

exports.builder = yargs => {
    yargs.options({
        cache: {
            default: true,
            description: 'whether to cache images during docker build',
            type: 'boolean'
        },
        provider: {
            alias: 'p',
            choices: ['virtualbox', 'hyperkit', 'kvm'],
            default: 'virtualbox',
            description: 'the vm provider to use',
            type: 'string'
        }
    });
};

exports.handler = async argv => {
    const { path, cache, provider } = argv;
    let { buildPath, infoPath, outputPath } = await env.makeContext(path);

    let info = await yaml.safeLoad(fs.readFileSync(infoPath));
    let pkgs = '';

    if (info.base_repository) buildPath = await env.cloneOrPull(info.base_repository);
    if (info.base_directory) buildPath = p.join(buildPath, info.base_directory);
    if (info.base_args) pkgs = info.base_args.PKGS;

    let context = {
        provider,
        buildPath,
        outputPath,
        dockerOpts: {
            nocache: !cache,
            buildargs: {
                'SSHPUBKEY': pubkey,
                'PKGS': pkgs
            }
        }
    }

    try {
        await build(context);
    } catch (e) {
        error(e);
    }
};
