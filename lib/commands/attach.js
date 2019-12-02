const storage = require('node-persist');

const { error } = require('../logger');

const { providers } = require('../providers');
const { providerArg } = require('../args');

const STORAGE_KEY = 'attach_last_vm';

exports.command = 'attach [name]';
exports.desc = 'Attach to a vm via SSH';

exports.builder = yargs => {
    yargs.options({
        provider: providerArg
    });
};

exports.handler = async argv => {
    let { name } = argv;
    const { provider } = argv;
    const lastVm = await storage.getItem(STORAGE_KEY);
    
    if (!name && !lastVm) {
        error('Must provide a VM name or have a VM running');
        return;
    } else if (!name) {
        name = lastVm;
    }

    providers[provider].attach(name);
};

exports.update = vm => {
    storage.setItem(STORAGE_KEY, vm);
}
