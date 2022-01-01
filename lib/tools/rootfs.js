const docker = require("./docker");
const pathUtil = require('path');

const env = require('../env');

class RootFs {

    // Size in MB
    async asExt4(vmDir, outputDir, size=512) {

        const {scriptdir} = env.vars();

        await docker.run('ottomatica/mkisofs', ['bash', '-c', `/script/make-ext4.sh ${size}`], {
            AutoRemove: true,
            Tty: true,
            Volumes: {
                "/script": {},
                "/slim-vm": {},
                "/out": {}
            },
            Hostconfig: {
                Privileged: true,
                Binds: [
                    `${pathUtil.resolve(scriptdir, 'scripts')}:/script`,
                    `${vmDir}:/slim-vm`,
                    `${outputDir}:/out`
                ]
            }
        });

    } 

    // Size in MB
    async asEfi(vmDir, outputDir, size=512) {

        const {scriptdir} = env.vars();

        await docker.run('ottomatica/mkisofs', ['bash', '-c', `/script/make-efi.sh ${size}`], {
            AutoRemove: true,
            Tty: true,
            Volumes: {
                "/script": {},
                "/slim-vm": {},
                "/out": {}
            },
            Hostconfig: {
                Privileged: true,
                Binds: [
                    `${pathUtil.resolve(scriptdir, 'scripts')}:/script`,
                    `${vmDir}:/slim-vm`,
                    `${outputDir}:/out`
                ]
            }
        });

    } 
    
}

module.exports = new RootFs();