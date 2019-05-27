const hasbin = require('hasbin');

const providers = {};

if (hasbin.sync('virsh')) providers['kvm'] = require('./providers/kvm');
if (hasbin.sync('hyperkit')) providers['hyperkit'] = require('./providers/hyperkit');
if (hasbin.sync('vboxmanage')) providers['virtualbox'] = require('./providers/virtualbox');

module.exports = providers;
