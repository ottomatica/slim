const hasbin = require('hasbin');

// specifies the compatibility between build targets (keys)
// and providers (values).
// for instance, using kvm as a build target produces images
// that are usable for either kvm or hyperkit.
const compatMap = {
    'hyperkit': ['kvm', 'hyperkit'],
    'kvm': ['kvm', 'hyperkit'],
    'virtualbox': ['virtualbox'],
};

// these are formats that each provider can build, with the
// first entry being the default format for that provider.
// the 'raw' format signifies an unbundled initrd and vmlinuz
const formatMap = {
    'hyperkit': ['raw', 'iso'],
    'kvm': ['raw', 'iso', 'qcow2'],
    'virtualbox': ['iso', 'raw'],
};

// map of provider name to class
const providers = {};

// only add available providers to the map
if (hasbin.sync('virsh')) providers['kvm'] = require('./providers/kvm');
if (hasbin.sync('hyperkit')) providers['hyperkit'] = require('./providers/hyperkit');
if (hasbin.sync('vboxmanage')) providers['virtualbox'] = require('./providers/virtualbox');

module.exports = {compatMap, formatMap, providers};
