const providers = require('../providers');

exports.command = 'vms';
exports.desc = 'List virtual machines';

exports.builder = yargs => {
    yargs.options({
        provider: {
            alias: 'p',
            choices: ['virtualbox', 'hyperkit', 'kvm'],
            default: 'virtualbox',
            description: 'the vm provider to use',
            type: 'string'
        }
    });
};

exports.handler = async argv => {
    let { provider } = argv;

    // TODO better output + return rather than print
    await providers[provider].list();
}
