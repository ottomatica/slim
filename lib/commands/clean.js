const fs = require('fs-extra');

const env = require('../env');

const { registry } = env.vars();
const { ok } = require('../logger');

exports.command = 'clean';
exports.desc = 'Clear all images from the registry';

exports.builder = () => {};

exports.handler = async () => {
    await fs.emptyDir(registry);

    ok('Registry cleared!');
};
