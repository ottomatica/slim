const fs = require('fs');
const path = require('path');
const yaml  = require('js-yaml');

const env = require('./env');
const providers = require('./providers');

const { registry } = env.vars();

class Images {
    constructor() {}

    async list()
    {
        return await Promise.all(fs.readdirSync(registry).map(async name => {
            let info = await this.info(name, registry);
            let size = await providers[info.provider].size(name);

            return {
                image: name,
                size: sizeToHumanSize(size),
                description: info.description,
                provider: info.provider
            };
        }));
    }

    async exists(name) {
        let info = await this.info(name);

        return providers[info.provider].exists(name);
    }

    async info(name) {
        return await yaml.safeLoad(fs.readFileSync(path.join(registry, name, 'info.yml')));
    }
}

function sizeToHumanSize(size) {
    if( size == 0 ) return 0;
    var i = Math.floor( Math.log(size) / Math.log(1024) );
    return ( size / Math.pow(1024, i) ).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
}

module.exports = new Images();
