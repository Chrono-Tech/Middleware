const net = require('net'),
  config = require('./config'),
  bunyan = require('bunyan'),
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

server.listen(`${/^win/.test(process.platform) ? '\\\\.\\pipe\\' : '/tmp/'}development/geth.ipc`, () => {
  log.info('Server: on listening');
});