const images = require('../images');

exports.command = 'images';
exports.desc = 'List available images';

exports.builder = () => {};

exports.handler = async () => {
    let table = await images.list();
    let transformed = table.reduce((table, {image, ...x}) => {
        table[image] = x;
        return table;
    }, {});

    console.table(transformed);
};
