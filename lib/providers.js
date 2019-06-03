const hasbin = require('hasbin');

// TODO add hyperkit
const kvm = require('./providers/kvm');
const vbox = require('./providers/virtualbox');

const providers = {};

if (hasbin.sync('virsh')) providers['kvm'] = kvm;
if (hasbin.sync('vboxmanage')) providers['virtualbox'] = vbox;

module.exports = providers;
