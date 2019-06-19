const hasbin = require('hasbin');

const compatMap = {
    'kvm': ['kvm', 'hyperkit'],
    'virtualbox': ['virtualbox'],
    'hyperkit': ['kvm', 'hyperkit']
};

// these are additional formats that each provider can build
// this doesn't include the format that we use to boot the provider,
// since that needs to be built each time anyways
// the 'raw' format signifies an unbundled initrd and vmlinuz
const formatMap = {
    'kvm': ['iso', 'qcow2'],
    'virtualbox': ['raw'],
    'hyperkit': ['iso']
};

const providerFormats = {
    'hyperkit': 'raw',
    'kvm': 'raw',
    'virtualbox': 'iso'
};

// map of provider name to class
const providers = {};

// only add available providers to the map
if (hasbin.sync('virsh')) providers['kvm'] = require('./providers/kvm');
if (hasbin.sync('hyperkit')) providers['hyperkit'] = require('./providers/hyperkit');
if (hasbin.sync('vboxmanage')) providers['virtualbox'] = require('./providers/virtualbox');

module.exports = {compatMap, formatMap, providerFormats, providers};
