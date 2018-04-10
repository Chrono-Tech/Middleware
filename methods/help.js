/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const chalk = require('chalk');

module.exports = () => {
  console.log(chalk.blue('available commands:'));
  console.log(chalk.blue('init - initialize middleware skeleton'));
  console.log(chalk.blue('install - install middleware components'));
  console.log(chalk.blue('help - print this message'));
};
