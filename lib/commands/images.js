const images = require('../images');

exports.command = 'images';
exports.desc = 'List available images';

exports.builder = () => {};

exports.handler = async () => {
    let table = await images.list();
    let transformed = table
        .map(i => ({
            image: i.image,
            size: sizeToHumanSize(i.size),
            description: i.description,
            providers: i.providers.join(', ')
        }))
        .reduce((table, {image, ...x}) => {
            table[image] = x;
            return table;
        }, {}
    );

    console.table(transformed);
};

function sizeToHumanSize(size) {
    if( size == 0 ) return 0;
    var i = Math.floor( Math.log(size) / Math.log(1024) );
    return ( size / Math.pow(1024, i) ).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
}
