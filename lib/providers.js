const hasbin = require('hasbin');

// TODO add hyperkit
const providers = {};

if (hasbin.sync('virsh')) providers['kvm'] = require('./providers/kvm');
if (hasbin.sync('vboxmanage')) providers['virtualbox'] = require('./providers/virtualbox');

module.exports = providers;
