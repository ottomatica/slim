exports.command = 'init';
exports.desc = 'Initialize slim';

exports.builder = yargs => {
};

exports.handler = async argv => {

    const docker = require("../tools/docker");
    try {
        await docker.pull( "ottomatica/vbox-img", {} );
    } catch (err ) {
        console.error( "Could not pull image", err.message );
    }

};