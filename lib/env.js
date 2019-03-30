
const fs = require('fs');
const path = require('path');
const os = require('os');

const download = require('download');
const ProgressBar = require('progress');


const slimdir = path.join( os.homedir(), '.slim');
const registery = path.join(slimdir, 'registery');

class Env {
    constructor() {}

    setup()
    {
        this._preparePaths();


        return this;
    }

    check()
    {

        return this;
    }

    vars()
    {
        return {
            slimdir: slimdir,
            registery: registery,
            env: this,
        }
    }

    async fetch(isoUrl, outputDir, name)
    {
        if (! fs.existsSync(path.join(outputDir, name)) /*|| (await md5File(isoPath)) != '851e2b2b34e31b67aa0758d25666e8e5'*/) {

            console.log(`Downloading base image ${isoUrl}`);
            const bar = new ProgressBar('[:bar] :percent :etas', {
                complete: '=',
                incomplete: ' ',
                width: 20,
                total: 0
            });

            await download(isoUrl, outputDir, {filename: name})
                  .on('response', res => {
                    // console.log(`Size: ${res.headers['content-length']}`);
                    bar.total = res.headers['content-length'];
                    res.on('data', data => bar.tick(data.length));
                  })
                  //.then(() => console.log('downloaded!'));


        }
    }

    _preparePaths()
    {
        if( !fs.existsSync(slimdir) ) { fs.mkdirSync(slimdir); }
        if( !fs.existsSync(registery) ) { fs.mkdirSync(registery); }
        
    }
}




module.exports = Env;