// TODO add hyperkit
const kvm = require('./providers/kvm');
const vbox = require('./providers/virtualbox');

const providers = {
    'kvm': kvm,
    'virtualbox': vbox
};

module.exports = providers;
