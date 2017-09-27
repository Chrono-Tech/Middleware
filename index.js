const _ = require('lodash'),
  Promise = require('bluebird'),
  chalk = require('chalk'),
  inquirer = require('inquirer'),
  gitDownload = require('download-git-repo'),
  download = Promise.promisify(gitDownload),
  {execSync} = require('child_process'),
  config = require('./config');

const setup = [{
  type: 'checkbox',
  message: 'Choose modules to install',
  name: 'modules',
  choices: _.map(config.modules, 'name')
}];

const init = async () => {

  let modules = _.chain(config.modules)
    .filter(module=> process.argv.slice(2).includes(module.name))
    .value();

  if (!modules.length) {
    let choices = await inquirer.prompt(setup);
    modules = _.filter(config.modules, m => choices.modules.includes(m.name));
  }

  for (let module of modules) {
    const moduleName = `core/${module.name}`;
    console.log(chalk.blue(`Downloading module ${moduleName}`));
    await download(module.url, moduleName)
      .catch(err => Promise.reject('Unable to download repo', err));

    process.chdir(`${__dirname}/${moduleName}`);
    console.log(chalk.blue('Installing it\'s dependencies ...'));
    execSync('npm i');
    process.chdir(__dirname);
  }


  console.log(chalk.green(`Installed these modules ${modules.map(m=>m.name).join(', ')}`));

}

module.exports = init();