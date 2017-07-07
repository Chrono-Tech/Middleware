const net = require('net'),
  config = require('./config'),
  bunyan = require('bunyan'),
  fs = require('fs'),
  log = bunyan.createLogger({name: 'ipcConverter'}),
  request = require('request');

const server = net.createServer(stream => {

  stream.on('data', c => {
    request.post(`http://${config.web3.networks.development.host}:${config.web3.networks.development.port}`,
      {body: c.toString()}, (err, resp, body) => {
        try {
          JSON.parse(body);
          stream.write(body);
        } catch (e) {
          log.error(e);
        }
      });
  });

});

if (!/^win/.test(process.platform) && !fs.existsSync('/tmp/development')){
  fs.mkdirSync('/tmp/development');
}

server.listen(`${/^win/.test(process.platform) ? '\\\\.\\pipe\\' : '/tmp/'}development/geth.ipc`, () => {
  log.info('Server: on listening');
});