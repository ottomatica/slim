const hasbin = require('hasbin');

const { info, error } = require('./logger');

const docker = require('./tools/docker');

const mustBin = bin => {
    if (!hasbin.sync(bin)) throw `You must have ${bin} installed to build a vm`;
}

const mustImage = async (image, cmd) => {
    if( ! await docker.imageExists( image ) ) {
        throw `You must have ${image} docker image to run ${cmd}.\nRun \`slim init\` to pull images.`;
    }
}

exports.check = async argv => {
    let cmd = argv._[0];

    try {        
        if( cmd === "build" || cmd === "cloudinit") {
            mustBin('docker');

            await mustImage( 'ottomatica/vbox-img', cmd );
            await mustImage( 'ottomatica/mkisofs', cmd  );

        }
    } catch (e) {
        error(e);
        process.exit(1);
    }
};
