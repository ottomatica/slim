const { info } = require('../logger');

const { providers } = require('../providers');
const { providerArg } = require('../args');

exports.command = 'vms';
exports.desc = 'List virtual machines';

exports.builder = yargs => {
    yargs.options({
        provider: {
            ...providerArg,
            default: undefined // we want to show all vms by default
        },
        health: {
            default: true,
            alias: 'h',
            description: 'provide health check for each VM',
            type: 'boolean'
        }
    });
};

exports.handler = async argv => {
    let { provider, health } = argv;

    let vms = [];
    if (provider) {
        vms.push(...await providers[provider].list());
    } else {
        for (const provider of Object.keys(providers)) {
            vms.push(...(await providers[provider].list()).map(v => ({...v, provider: provider})));
        }
    }

    if (vms.length === 0) {
        info('No virtual machines');
        return;
    }

    const table = [];
    for (const vm of vms) {
        const { id, name, ...x } = vm;
        table[id] = { name, ...x };

        if (health) {
            const tableProvider = provider ? provider : vm.provider; // use the provider flag if present
            table[id]["online"] = await providers[tableProvider].health(name);
        }
    }

    console.table(table);
}
