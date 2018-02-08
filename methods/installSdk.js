const fs = require('fs-extra'),
  chalk = require('chalk'),
  {execSync} = require('child_process'),
  path = require('path');

module.exports = async (dir, args) => {

  await fs.ensureDir(path.join(dir, 'core'));
  await fs.copy(path.join(__dirname, '../template/sdk'), path.join(dir, args[0] || ''));

  process.chdir(path.join(dir, args[0] || ''));
  console.log(chalk.blue('Installing it\'s dependencies ...'));
  execSync('npm i');
  process.chdir(dir);

  console.log(chalk.green('Installed!'));

};
