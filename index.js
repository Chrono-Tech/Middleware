const inquirer = require('inquirer'),
  actions = {
    init: require('./methods/init'),
    install: require('./methods/install'),
    help: require('./methods/help')
  };

const init = async () => {

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
