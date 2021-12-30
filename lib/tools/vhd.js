const docker = require("./docker");
const pathUtil = require('path');
const fs = require('fs-extra');

class Vhd {

async makeVhd( inputPath, outputPath ) {

        const input = pathUtil.basename( inputPath );
        const inputDir = pathUtil.dirname( inputPath );
        const output = pathUtil.basename( outputPath );
        const args = ['--srcfilename', input, '--srcformat', 'RAW', '--dstfilename', output, '--dstformat', 'VHD' ];

        await docker.run("ottomatica/vbox-img", ['vbox-img', 'convert', ...args], {
            AutoRemove: true,
            Tty: true,
            Volumes: {
                "/v": { }
            },
            Hostconfig: {
                Binds: [
                    `${inputDir}:/v`
                ]
            },
            WorkingDir: "/v"
        });

        // Move output if it needs to be in another directory
        if( pathUtil.join(inputDir, output) != outputPath ) {
            await fs.move( pathUtil.join( inputDir, output), outputPath, {overwrite: true} );
        }
    } 
}

module.exports = new Vhd();