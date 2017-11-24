const chalk = require('chalk');

module.exports = () => {
  console.log(chalk.blue('available commands:'));
  console.log(chalk.blue('init - initialize middleware skeleton'));
  console.log(chalk.blue('install - install middleware components'));
  console.log(chalk.blue('help - print this message'));
};
