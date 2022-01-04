const fs   = require('fs-extra');
const p    = require('path');
const yaml = require('js-yaml');

const { error } = require('../logger');

const build = require('../build');
const env   = require('../env');

const availFormats = ['raw', 'initrd', 'iso', 'qcow2', 'vhd']

const { pubkey } = env.vars();

function getDefaultPlatform() {

    let commonMappings = {
        'x64' : 'amd64'
    };
    let arch = process.arch;
    arch = commonMappings[arch] || arch;
    return arch;
}


exports.command = 'build [path]';
exports.desc = 'Build a new vm';

exports.builder = yargs => {
    yargs.options({
        cache: {
            default: true,
            description: 'whether to cache images during docker build',
            type: 'boolean'
        },
        platform: {
            default: getDefaultPlatform(),
            description: 'platform option for docker build',
            type: 'string'
        },
        format: {
            alias: 'f',
            default: "raw",
            description: 'image formats to build',
            type: 'string'
        },
        zip: {
            alias: 'z',
            default: false,
            description: 'Compress raw image',
            type: 'boolean'
        },
        size: {
            alias: 's',
            default: 512,
            description: 'Size for rootfs (in MB)',
            type: 'string'
        }

    });
};

exports.handler = async argv => {
    let { path, cache, platform, format, zip, size } = argv;

    if( !path ) {
        error("Path with Dockerfile is required.");
        process.exit(1);
    }

    // ensure format is an array
    if (typeof(format) === 'string') format = [format]

    // Check if we support format.
    for (let f of format) {
        if (!availFormats.includes(f)) {
            error(`Format ${f} is not supported`);
            return;
        }
    }

    let { buildPath, infoPath, outputDir } = await env.makeContext(path);

    let info = await yaml.safeLoad(fs.readFileSync(infoPath));
    let base_args = '';

    if (info.base_repository) buildPath = await env.cloneOrPull(info.base_repository);
    if (info.base_directory) buildPath = p.join(buildPath, info.base_directory);
    if (info.base_args) base_args = info.base_args;
    // base_args["SSHPUBKEY"] = pubkey;

    await fs.writeFile(p.join(outputDir, 'info.yml'), await yaml.safeDump(info));

    let context = {
        format,
        formatOptions: {
            zip: zip,
            size: size
        },
        buildPath,
        outputDir,
        dockerOpts: {
            nocache: !cache,
            platform: platform,
            buildargs: base_args
        }
    }

    try {
        await build(context);
    } catch (e) {
        error(e);
    }
};
