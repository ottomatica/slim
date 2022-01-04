
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const git = require('simple-git');

const download = require('download');
const ProgressBar = require('progress');


// All things slim
const slimdir = path.join( os.homedir(), '.slim');
// For storing images built by slim
const registry = path.join(slimdir, 'registry');
// For storing base images (Dockerfiles, etc.) retrieved via git.
const baseImages = path.join(slimdir, 'baseImages');
// Script directory
const scriptdir = path.dirname(require.main.filename);

class Env {
    constructor() {}

    async setup()
    {
        this._preparePaths();

        // Ensure baker keys are installed.
        fs.copyFileSync(path.resolve(scriptdir, 'scripts', 'keys', 'baker_rsa'), path.join(slimdir, 'baker_rsa'));
        await fs.chmod(path.join(slimdir, 'baker_rsa'), '600', () => {});

        this.pubkey = fs.readFileSync(path.join(scriptdir, 'scripts', 'keys', 'baker.pub')).toString();


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
            registry: registry,
            scriptdir: scriptdir,
            pubkey: this.pubkey,
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

    async makeContext(p) {
        let buildPath = path.resolve(p);
        let infoPath = path.join(buildPath, 'info.yml');
        let name = path.basename(buildPath);
        let outputDir = path.join(registry, name);

        await Promise.all([
            expectPath(infoPath, `Expected config does not exist in ${infoPath}`),
            expectPath(buildPath, `Build path ${buildPath} does not exist`),
            fs.ensureDir(outputDir),
        ]);

        return {
            buildPath,
            infoPath,
            outputDir
        };
    }

    _preparePaths()
    {
        if( !fs.existsSync(slimdir) ) { fs.mkdirSync(slimdir); }
        if( !fs.existsSync(registry) ) { fs.mkdirSync(registry); }
        if( !fs.existsSync(baseImages) ) { fs.mkdirSync(baseImages); }
    }
}

async function expectPath(p, msg) {
    let exists = await fs.exists(p);
    if (!exists) {
        throw new Error(msg);
    }
}



module.exports = new Env();
