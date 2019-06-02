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

            let total = 0;
            for (const p of info.providers) {
                let size = await providers[p].size(name);
                total += size;
            }

            return {
                image: name,
                size: total,
                description: info.description,
                providers: info.providers
            };
        }));
    }

    async exists(name, provider) {
        return providers[provider].exists(name);
    }

    async info(name) {
        return await yaml.safeLoad(fs.readFileSync(path.join(registry, name, 'info.yml')));
    }
}

module.exports = new Images();
