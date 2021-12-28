
const { formatMap, providers } = require('./providers');
const names = Object.keys(providers);

const providerArg = {
    alias: 'p',
    choices: ['hyperkit', 'kvm', 'virtualbox', 'none'],
    default: defaultProvider(),
    description: 'the vm provider to use',
    type: 'string'
};

const formatArg = {
    alias: 'f',
    default: defaultFormat(providerArg.default),
    description: 'additional image formats to build',
    type: 'string'
};

module.exports = { providerArg, formatArg };

function defaultProvider() {
    if (names.length === 0) return 'none';
    else if (names.indexOf('virtualbox') !== -1) return 'virtualbox';
    else return names[0];
}

function defaultFormat(provider) {
    // assign provider's base format if none specified.
    let [ base, ] = formatMap[provider];
    return [base];    
}