const fs = require('fs-extra');
const path = require('path');
const yaml  = require('js-yaml');

const env = require('./env');
const providers = require('./providers');

const { registry } = env.vars();

class Images {
    constructor() {}

    async list()
    {
        let images = [];

        for (let name of fs.readdirSync(registry)) {
            try {
                let info = await this.info(name, registry);

                let total = 0;
                for (let p of info.providers) {
                    if (!providers[p]) { continue; }
                    total += await providers[p].size(name);
                }

                images.push({
                    image: name,
                    size: total,
                    description: info.description,
                    providers: info.providers,
                });
            } catch (e) { undefined }
        }

        return images;
    }

    async exists(name) {
        return await fs.exists(path.join(registry, name, 'info.yml'));
    }

    async info(name) {
        return await yaml.safeLoad(fs.readFileSync(path.join(registry, name, 'info.yml')));
    }
}

module.exports = new Images();
