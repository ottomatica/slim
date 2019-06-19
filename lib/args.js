const providers = Object.keys(require('./providers').providers);

const providerArg = {
    alias: 'p',
    choices: ['hyperkit', 'kvm', 'virtualbox'],
    default: defaultProvider(),
    description: 'the vm provider to use',
    type: 'string'
}

module.exports = { providerArg };

function defaultProvider() {
    if (providers.length === 0) return '';
    else if (providers.indexOf('virtualbox') !== -1) return 'virtualbox';
    else return providers[0];
}
