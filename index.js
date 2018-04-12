#! /usr/bin/env node

/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */


const inquirer = require('inquirer'),
  _ = require('lodash'),
  actions = {
    init: require('./methods/init'),
    install: require('./methods/install'),
    starter: require('./methods/installSdk'),
    help: require('./methods/help')
  };

const init = async () => {

  let action = _.chain(actions)
    .keys()
    .find(action => process.argv.slice(2).includes(action))
    .value();

  let args = _.drop(process.argv.slice(2), 1);

  if (action)
    return actions[action](process.cwd(), args);


  const setup = [{
    type: 'list',
    message: 'Choose action',
    name: 'action',
    choices: Object.keys(actions)
  }];

  let option = await inquirer.prompt(setup);
  actions[option.action](process.cwd());

};

module.exports = init();
