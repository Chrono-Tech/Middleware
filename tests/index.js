const spawn = require('child_process').spawn,
  fs = require('fs'),
  _ = require('lodash'),
  expect = require('chai').expect,
  ctx = {},
  getRepos = require('../utils/getRepos'),
  path = require('path');

describe('tests', function () {

  before(async function () {
    ctx.repos = await getRepos();
    ctx.installModules = _.chain(ctx.repos)
      .shuffle()
      .take(_.random(1, 3))
      .map(repo=>repo.name)
      .value();
  });

  it('install all repos', async () => {

    await new Promise((res, rej) =>
      spawn('node', _.union(['.', 'install'], ctx.installModules), {
        stdio: 'inherit',
        shell: true
      })
        .on('error', rej)
        .on('close', res)
    );
  });

  it('should check, that all modules are installed', () => {
    let checked = ctx.installModules.filter(app => fs.existsSync(path.join('core', app)));
    expect(checked.length).to.equal(ctx.installModules.length);
  })

});
