const { info } = require('../logger');

const providers = require('../providers');
const { providerArg } = require('../args');

exports.command = 'vms';
exports.desc = 'List virtual machines';

exports.builder = yargs => {
    yargs.options({
        provider: {
            ...providerArg,
            default: undefined // we want to show all vms by default
        }
    });
};

exports.handler = async argv => {
    let { provider } = argv;

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

    let transformed = vms.reduce((table, {id, ...x}) => {
        table[id] = x;
        return table;
    }, {});

    console.table(transformed);
}
