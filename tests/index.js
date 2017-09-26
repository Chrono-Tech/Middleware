const spawn = require('child_process').spawn,
  config = require('../config'),
  fs = require('fs'),
  _ = require('lodash'),
  expect = require('chai').expect,
  path = require('path');

describe('tests', function () {

  it('install all repos', async () => {
    await new Promise((res, rej) =>
      spawn('node', _.union(['.'], config.modules.map(m => m.name)), {
        stdio: 'inherit',
        shell: true
      })
        .on('error', rej)
        .on('close', res)
    );
  });


  it('should check, that all modules are installed', ()=>{
    let checked = config.modules.filter(app => fs.existsSync(path.join('core', app.name)));
    expect(checked.length).to.equal(config.modules.length);
  })


});
