exports.command = 'init';
exports.desc = 'Initialize slim';

exports.builder = yargs => {
};

exports.handler = async argv => {

    // const docker = require("../tools/docker");
    // try {
    //     await docker.pull( "ottomatica/vbox-img", {} );
    // } catch (err ) {
    //     console.error( "Could not pull image", err.message );
    // }

    const makeiso = require('../tools/makeiso');

    let baseDir = '/Users/cjparnin/projects/slim/images/ubuntu-20.04-cloud-init';
    let output = "cidata.iso";
    await makeiso.createCloudInitIso(baseDir, output);

};