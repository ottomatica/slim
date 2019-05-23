
const fs = require('fs');
const path = require('path');
const os = require('os');
const git = require('simple-git');

const download = require('download');
const ProgressBar = require('progress');


// All things slim
const slimdir = path.join( os.homedir(), '.slim');
// For storing images built by slim
const registery = path.join(slimdir, 'registery');
// For storing base images (Dockerfiles, etc.) retrieved via git.
const baseImages = path.join(slimdir, 'baseImages');

class Env {
    constructor() {}

    async setup()
    {
        this._preparePaths();

        // Ensure baker keys are installed.
        fs.copyFileSync(path.resolve(__dirname, '../scripts/keys/baker_rsa'), path.join(slimdir, 'baker_rsa'));
        await fs.chmod(path.join(slimdir, 'baker_rsa'), '600', () => {});


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

    async cloneOrPull(repoURL, dest) {
        let name = path.basename(repoURL);
        name = name.slice(-4) === '.git' ? name.slice(0, -4) : name; // Removing .git from the end
        let dir = path.join(baseImages);
        let repo_dir = path.join(dir, name);

        return new Promise((resolve, reject) => {

            // Run git pull if repo already exists locally
            if( fs.existsSync(repo_dir) )
            {
                git(repo_dir).pull( (err, data) => 
                {
                    if (err)
                        reject(err);
                    else
                        resolve(repo_dir);
                })
            }
            else // clone
            {
               git(dir).silent(true).clone(repoURL, (err, data) => {
                    if (err)
                        reject(err);
                    else
                        resolve(repo_dir);
                });
            }
        });
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
        if( !fs.existsSync(baseImages) ) { fs.mkdirSync(baseImages); }
        
    }
}




module.exports = Env;