const env    = require('../env');
const images = require('../images');

const { registry } = env.vars();

exports.command = 'images';
exports.desc = 'List available images';

exports.builder = () => {};

exports.handler = async () => {
    let table = await images.list(registry);
    let transformed = table.reduce((table, {image, ...x}) => {
        table[image] = x;
        return table;
    }, {});

    console.table(transformed);
};
