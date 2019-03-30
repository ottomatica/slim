const fs = require('fs');
const path = require('path');

class Images {
    constructor() {}

    list(registery)
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

            let infoPath = path.join(registery, dir, 'info.txt');
            let info = undefined;
            if (fs.existsSync( infoPath ) ){ info = fs.readFileSync(infoPath).toString();}
            img.description = info;
            table.push(img);
        }
        return table;
    }
}



module.exports = Images;