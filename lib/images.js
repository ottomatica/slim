const fs = require('fs');
const path = require('path');
const yaml  = require('js-yaml');

class Images {
    constructor() {}

    async list(registery)
    {
        let sizeToHumanSize = function (size) {
            if( size == 0 ) return 0;
            var i = Math.floor( Math.log(size) / Math.log(1024) );
            return ( size / Math.pow(1024, i) ).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
        };

        let table = [];
        for( let dir of fs.readdirSync(registery) )
        {
            let iso = path.join(registery, dir, 'slim.iso');
            let img = {};
            img.image = dir;
            img.size  = sizeToHumanSize(fs.statSync(iso).size)

            let info = await yaml.safeLoad(fs.readFileSync(path.join(registery, dir, 'info.yml')));
            img.description = info.description;
            table.push(img);
        }
        return table;
    }

    async exists(name, registery) {
        const images = (await this.list(registery)).map(image => image.image);
        return images.includes(name);
    }
}



module.exports = Images;