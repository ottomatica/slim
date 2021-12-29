const pathUtil = require('path');

exports.command = 'cloudinit [path]';
exports.desc = 'Create cloud init iso';

exports.builder = yargs => {
};

exports.handler = async argv => {

    let { path } = argv;
    const makeiso = require('../tools/makeiso');

    let output = "cidata.iso";

    // Must be absolute path
    if( !pathUtil.isAbsolute( path ) ) {
        path = pathUtil.resolve( path );
    }
    await makeiso.createCloudInitIso(path, output);

};