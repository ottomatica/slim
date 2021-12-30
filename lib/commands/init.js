exports.command = 'init';
exports.desc = 'Initialize slim';

exports.builder = yargs => {
};

exports.handler = async argv => {

    // const docker = require("../tools/docker");
    // try {
    //     await docker.pull( "ottomatica/vbox-img", {}, undefined, false );
    //     await docker.pull( "ottomatica/mkisofs", {}, undefined, false );
    // } catch (err ) {
    //     console.error( "Could not pull image", err.message );
    // }

    const rootFs = require("../tools/rootfs");
    await rootFs.image(
        "/Users/cjparnin/.slim/slim-vm",
        "/Users/cjparnin/.slim/registry/ubuntu-20.04-cloud-init"
    );

};