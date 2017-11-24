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

module.exports = async (dir, modules) => {

  let repos = await getRepos();

  modules = _.chain(modules)
    .transform((result, module) => {

      module = module.split('#');
      let moduleName = module[0];
      let tag = module[1] || 'latest';

      let repo = _.find(repos, {name: moduleName});
      if (!repo)
        return;

      repo.tag = tag;
      result.push(repo);
    }, [])
    .value();

  if (_.isEmpty(modules)) {
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

    if (!module.tag) {
      const tag = [{
        type: 'list',
        message: 'Choose module tag',
        name: 'tag',
        choices: _.chain(tags)
          .defaults([])
          .union([{name: 'latest'}])
          .orderBy('name')
          .map(repo => repo.name)
          .value()
      }];

      module.tag = (await inquirer.prompt(tag)).tag;
    } else {
      module.tag = _.chain(tags)
        .find({name: module.tag})
        .get('name', 'latest')
        .value();
    }

    const moduleName = `core/${module.name}`;
    console.log(chalk.blue(`removing old module ${moduleName} (if exists)`));
    await fs.remove(path.join(dir, moduleName));

    console.log(chalk.blue(`Downloading module ${moduleName}`));
    console.log(`${module.url}#${module.tag}`);
    await download(`${module.url}${module.tag === 'latest' ? '' : '#' + module.tag}`, moduleName)
      .catch(err => Promise.reject(`Unable to download repo: ${err}`));

    process.chdir(path.join(dir, moduleName));
    console.log(chalk.blue('Installing it\'s dependencies ...'));
    execSync('npm i');
    process.chdir(dir);
  }

  console.log(chalk.green(`Installed these modules ${modules.map(m => m.name).join(', ')}`));

};
