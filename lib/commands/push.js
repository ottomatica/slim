const env = require('../env');
const fs = require('fs-extra');
const path = require('path');
const { Octokit } = require("@octokit/rest");
const { ok } = require('../logger');

const { registry } = env.vars();
const registryPath = registry;

exports.command = 'push <image> <registry>';
exports.desc = 'Build a new microkernel';

exports.builder = yargs => {
    yargs.options({
        force: {
            default: true,
            description: 'delete the old image from registry and re-upload',
            type: 'boolean'
        }
    });
};

exports.handler = async argv => {
    let { image, registry, force } = argv;

    const [owner, repo, release] = registry.split(/[\/#]/g);
    const ghToken = process.env.GH_TOKEN;

    let imageAssets = [
        path.join(registryPath, image, 'vmlinuz'),
        path.join(registryPath, image, 'initrd'),
        path.join(registryPath, image, 'slim.iso')];

    for (let asset of imageAssets) {
        if (fs.existsSync(asset)) {
            await uploadAsset(owner, repo, release, asset, image, ghToken, force);
            ok(`Pushed asset: ${asset}`);
        }
    }
};

async function uploadAsset(owner, repo, release, file, imageName, token, force = true) {
    const octokit = new Octokit({ auth: 'token ' + token });

    let fileName = path.basename(file);
    if (fileName === 'slim.iso') fileName = 'vbox.iso';

    const releases = await octokit.repos.listReleases({
        owner,
        repo
    });

    let existingRelease = releases.data.filter(r => r.tag_name == release)[0];

    // creating release if doesn't exist
    if (!existingRelease) {
        existingRelease = (await octokit.repos.createRelease({
            owner,
            repo,
            tag_name: release
        })).data;
    }

    let upload_url = existingRelease.upload_url;

    // delete old asset before uploading
    if (force) {
        try {
            await octokit.repos.deleteReleaseAsset({
                owner,
                repo,
                asset_id: existingRelease.assets.filter(a => a.name == `${imageName}-${fileName}`)[0].id,
            });
        } catch (err) { }
    }

    // upload
    try {
        await octokit.repos.uploadReleaseAsset({
            url: upload_url,
            file: fs.createReadStream(file),
            headers: {
                'content-type': 'application/octet-stream',
                'content-length': (await fs.stat(file)).size
            },
            name: `${imageName}-${fileName}`,
            owner,
            repo
        });
    } catch (err) {
        console.error(err);
    }
}
