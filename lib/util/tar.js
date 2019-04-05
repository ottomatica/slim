
const tar = require('tar');

var args = process.argv.slice(2);

(async()=>{

    await tar.x(  // or tar.extract(
        {
          file: args[0],
          C: args[1]
        }
    );

})();

