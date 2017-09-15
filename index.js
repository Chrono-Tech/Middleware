const _ = require('lodash'),
  Promise = require('bluebird'),
  chalk = require('chalk'),
  minimist = require('minimist'),
  inquirer = require('inquirer'),
  gitDownload = require('download-git-repo'),
  download = Promise.promisify(gitDownload),
  { execSync } = require('child_process');
  config = require('./config');

const setup = [{
  type: 'checkbox',
  message: 'Choose modules to install',
  name: 'modules',
  choices: _.map(config.modules, 'name')
}];

inquirer.prompt(setup)
  .then(choices => loadModules(choices.modules));

function loadModules(choices) {
  const modules = _.filter(config.modules, m => choices.indexOf(m.name) !== -1);
  Promise.each(modules, getRepo)
    .then(m => console.log(chalk.green(`Installed these modules ${choices}`)))
    .catch(err => console.error(err));
}

async function getRepo(module) {
  const currentDir = __dirname;
  const moduleName = `core/${module.name}`;

  console.log(chalk.blue(`Downloading module ${moduleName}`));
  return download(module.url, moduleName)
    .then(r => {
      process.chdir(`${currentDir}/${moduleName}`);
      console.log(chalk.blue('Installing it\'s dependencies ...'));
      execSync('npm i');
      process.chdir(currentDir);      
    })
    .catch(err => Promise.reject('Unable to download repo', err));
}