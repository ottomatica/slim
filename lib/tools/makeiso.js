const hasbin = require('hasbin');
const docker = require("./docker");
const child = require('child_process');
const fs   = require('fs-extra');
const pathUtil = require('path');

class MakeIsoWithBin {

    async createBootableIso(outputPath, volume, isoFilesPath) {

        child.execSync(`
        mkisofs -o ${outputPath} \
        -b isolinux/isolinux.bin \
        -c isolinux/boot.cat \
        -no-emul-boot -boot-load-size 4 -boot-info-table \
        -V ${volume} -J -R ${isoFilesPath}`, {stdio: 'inherit'});

    }

    async createCloudInitIso( baseDir, outputPath ) {

        child.execSync(`mkisofs -o ${outputPath} \
        -V cidata -J -R user-data meta-data`, {stdio: 'inherit', cwd: baseDir});

    }
}

class MakeIsoWithDocker {

    async createBootableIso(outputPath, volume, isoFilesPath) {

        const output = pathUtil.basename( outputPath );
        const outputDir = pathUtil.dirname( outputPath );

        const args = ['-o', `/iso/${output}`, '-no-emul-boot', '-boot-info-table', '-R', '-J',
        '-boot-load-size', '4', '-b', 'isolinux/isolinux.bin', '-c', 'isolinux/boot.cat',
        '-V', volume, '/slim-iso' ]

        console.log( ['mkisofs', ...args].join(' '));

        await docker.run("ottomatica/mkisofs", ['mkisofs', ...args], {
            AutoRemove: true,
            Tty: true,
            Volumes: {
                "/slim-iso": {},
                "/iso": {}
            },
            Hostconfig: {
                Binds: [
                    `${isoFilesPath}:/slim-iso`,
                    `${outputDir}:/iso`
                ]
            },
            WorkingDir: "/slim-iso"
        });

        // console.log( outputDir );
    } 

    async createCloudInitIso( baseDir, outputPath ) {

        const output = pathUtil.basename( outputPath );
        const args = ['-o', output, '-R', '-J', '-V', 'cidata', 'user-data', 'meta-data' ];

        await docker.run("ottomatica/mkisofs", ['mkisofs', ...args], {
            AutoRemove: true,
            Tty: true,
            Volumes: {
                "/v": { }
            },
            Hostconfig: {
                Binds: [
                    `${baseDir}:/v`
                ]
            },
            WorkingDir: "/v"
        });

        await fs.move( pathUtil.join( baseDir, output), outputPath, {overwrite: true} );
    } 


}

if( hasbin("mkisofs") ) {
    module.exports = new MakeIsoWithBin();
} else {
    module.exports = new MakeIsoWithDocker();
}
