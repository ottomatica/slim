const pathUtil = require('path');
const env   = require('../env');
const makeiso = require('../tools/makeiso');

exports.command = 'cloudinit [path]';
exports.desc = 'Create cloud init iso';

exports.builder = yargs => {
};

exports.handler = async argv => {

    let { path } = argv;
    let { buildPath, outputDir } = await env.makeContext(path);

    await makeiso.createCloudInitIso(buildPath, pathUtil.join( outputDir, 'cidata.iso'));
};