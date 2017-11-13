const _ = require('lodash'),
  Promise = require('bluebird'),
  fs = require('fs-extra'),
  chalk = require('chalk'),
  inquirer = require('inquirer'),
  gitDownload = require('download-git-repo'),
  download = Promise.promisify(gitDownload),
  request = require('request-promise'),
  {execSync} = require('child_process'),
  path = require('path'),
  getRepos = require('../utils/getRepos');

module.exports = async (dir) => {

  let repos = await getRepos();

  let modules = _.chain(repos)
    .filter(module => process.argv.slice(2).includes(module.name))
    .value();

  if (!modules.length) {
    const setup = [{
      type: 'checkbox',
      message: 'Choose modules to install',
      name: 'modules',
      choices: _.chain(repos)
        .orderBy('type')
        .map(repo => `${repo.name}  (${repo.type})`)
        .value()
    }];

    let choices = await inquirer.prompt(setup);
    modules = _.filter(repos, repo => choices.modules.includes(`${repo.name}  (${repo.type})`));
  }

  for (let module of modules) {

    let tags = await request({
      uri: module.tags_url,
      headers: {
        'User-Agent': 'Request-Promise'
      },
      json: true
    });

    const tag = [{
      type: 'list',
      message: 'Choose module tag',
      name: 'tag',
      choices: _.chain(tags)
        .defaults([{name: 'latest'}])
        .orderBy('name')
        .map(repo => repo.name)
        .value()
    }];

    let choice = await inquirer.prompt(tag);

    const moduleName = `core/${module.name}`;
    console.log(chalk.blue(`removing old module ${moduleName} (if exists)`));
    await fs.remove(path.join(dir, moduleName));

    console.log(chalk.blue(`Downloading module ${moduleName}`));
    console.log(`${module.url}#${choice.tag}`)
    await download(`${module.url}${choice.tag === 'latest' ? '' : '#' + choice.tag}`, moduleName)
      .catch(err => Promise.reject(`Unable to download repo: ${err}`));

    process.chdir(path.join(dir, moduleName));
    console.log(chalk.blue('Installing it\'s dependencies ...'));
    execSync('npm i');
    process.chdir(dir);
  }

  console.log(chalk.green(`Installed these modules ${modules.map(m => m.name).join(', ')}`));

};
