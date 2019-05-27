const chalk  = require('chalk');

const error = e => console.error(chalk.red(e));
const info = m => console.log(chalk.yellow(m));
const ok = m => console.log(chalk.green(m));

module.exports = {error, info, ok};
