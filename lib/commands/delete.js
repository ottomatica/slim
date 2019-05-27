const fs   = require('fs-extra');
const path = require('path');

const { error } = require('../logger');

const env    = require('../env');
const images = require('../images');
const micro  = require('../micro');

const { registry } = env.vars();

exports.command = 'delete <vm|image> <name>';
exports.desc = 'Delete a microkernel image or vm';

exports.builder = () => {};

exports.handler = async argv => {
    const { vm, image, name } = argv;

    if (vm === 'vm') {
        if (name) await micro.delete(name);
    } else if (image === 'image') {
        if (await images.exists(name, registry)) {
            await fs.remove(path.resolve(registry, name));
        } else {
            error(`${name} image not found`);
        }
    }
};
