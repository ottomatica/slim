const os = require('os');
const vbox = require('node-virtualbox');

class Micro {
    constructor() 
    {
        this.defaultOptions = 
        {
            mem: 1024,
            disk: false,
            verbose: true
        }
    }


    async create(name, options)
    {
        let root = (os.platform() == "win32") ? `${process.cwd().split(path.sep)[0]}/` : "/";

        // Required options
        options.vmname = name;
        options.micro  = true;
        options.syncs  = [`${root};/data`];
        options.ssh_port = options.ssh_port;

        // Overrideable options
        options.mem = options.mem || this.defaultOptions.mem;
        options.disk = options.disk || this.defaultOptions.disk;
        options.verbose = options.verbose || this.defaultOptions.verbose;

        // if ((await provider.driver.list()).filter(e => e.name === name).length == 0) {
            await vbox(options);
        //} else if((await (new VBoxProvider()).getState('baker-srv')) != 'running') {
        //    await vbox({start: true, vmname: 'baker-srv', syncs: [], verbose: true});
        //}
    }

}




module.exports = Micro;