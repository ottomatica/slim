
const fs = require('fs');
const path = require('path');
const os = require('os');

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
            registery: registery
        }
    }

    _preparePaths()
    {
        if( !fs.existsSync(slimdir) ) { fs.mkdirSync(slimdir); }
        if( !fs.existsSync(registery) ) { fs.mkdirSync(registery); }
        
    }
}




module.exports = Env;