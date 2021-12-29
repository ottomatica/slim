const hasbin = require('hasbin');

const { error } = require('./logger');

const depMap = {
    'build': [
        () => mustBin('docker'),
        // () => mustBin('cpio'),
        // () => mustBin('gzip'),
    ]
}

const mustBin = bin => {
    if (!hasbin.sync(bin)) throw `You must have ${bin} installed to build a microkernel`;
}

exports.check = argv => {
    let cmd = argv._[0];

    try {
        (depMap[cmd] || []).forEach(d => d(argv));

        let { format } = argv;
        if (typeof(format) === 'string') format = [format]
        if( format && format.indexOf("iso") >= 0 ) {
            // try {
                mustBin('mkisofs');
            // } catch (err ) {

            // }
        }

    } catch (e) {
        error(e);
        process.exit(1);
    }
};
