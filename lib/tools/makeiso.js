const hasbin = require('hasbin');
const docker = require("./docker");


class MakeIsoWithBin {

    async createBootableIso(bootBin, bootCatalog, volume, files) {

    }

    async createCloudInitIso( baseDir, output ) {

    }
}

class MakeIsoWithDocker {

    async createBootableIso(bootBin, bootCatalog, volume, files) {

        const args = ['--no-emulation-boot', '--boot-info-table', '-R', '-J',
        '--boot-load-size', '4',  '-b', bootBin, '-c', bootCatalog, 
        '--volid', volume, ...files ]

        await docker.run("ottomatica/vbox-img", ['vbox-img', 'createiso', ...args], {
            AutoRemove: true,
            Tty: true,
        });
    } 

    async createCloudInitIso( baseDir, output ) {

        const args = ['--output', output, '-R', '-J', '--volid', 'cidata', 'user-data', 'meta-data' ];

        await docker.run("ottomatica/vbox-img", ['vbox-img', 'createiso', ...args], {
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
    } 


}

if( hasbin("mkisofs") ) {
    module.exports = new MakeIsoWithBin();
} else {
    module.exports = new MakeIsoWithDocker();
}
