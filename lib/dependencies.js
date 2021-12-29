const hasbin = require('hasbin');

const providers = Object.keys(require('./providers').providers);

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
        if (providers.length === 0) {
            throw 'You don\'t have any providers installed! Please see the docs for a list of supported providers';
        }

        let { provider } = argv;
        if (provider && providers.indexOf(provider) === -1) {
            throw `Provider ${provider} is not installed! Please see the docs for a list of supported providers`;
        }

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
