const pathUtil = require('path');
const fs   = require('fs-extra');
const env   = require('../env');
const makeiso = require('../tools/makeiso');

exports.command = 'cloudinit [path]';
exports.desc = 'Create cloud init iso';

exports.builder = yargs => {
};

exports.handler = async argv => {

    let { path } = argv;
    let { buildPath, outputDir } = await env.makeContext(path);

    await makeiso.createCloudInitIso(buildPath, 'cidata.iso');
    fs.moveSync( pathUtil.join(buildPath, 'cidata.iso'), pathUtil.join( outputDir, 'cidata.iso') );

};