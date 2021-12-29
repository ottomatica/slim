const hasbin = require('hasbin');

const { error } = require('./logger');

const depMap = {
    'build': [
        () => mustBin('docker'),
    ],
}

const mustBin = bin => {
    if (!hasbin.sync(bin)) throw `You must have ${bin} installed to build a vm`;
}

exports.check = argv => {
    let cmd = argv._[0];

    try {
        (depMap[cmd] || []).forEach(d => d(argv));

        let { format } = argv;
        if (typeof(format) === 'string') format = [format]
        if( format && format.indexOf("iso") >= 0 ) {
                mustBin('mkisofs');
        }
        if( format && format.indexOf("qcow2") >= 0 ) {
            mustBin('qemu-img');
    }


    } catch (e) {
        error(e);
        process.exit(1);
    }
};
