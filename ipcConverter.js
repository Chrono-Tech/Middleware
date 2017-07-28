const net = require('net'),
  config = require('./config'),
  bunyan = require('bunyan'),
  fs = require('fs'),
  log = bunyan.createLogger({name: 'ipcConverter'}),
  _ = require('lodash'),
  request = require('request');

const networks = _.keys(config.web3.networks);


networks.forEach(network => {

  const server = net.createServer(stream => {

    stream.on('data', c => {
      request.post(`http://${config.web3.networks[network].host}:${config.web3.networks[network].port}`,
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

  if (!/^win/.test(process.platform) && !fs.existsSync(`/tmp/${network}`)) {
    fs.mkdirSync(`/tmp/${network}`);
  }

  server.listen(`${/^win/.test(process.platform) ? '\\\\.\\pipe\\' : '/tmp/'}${network}/geth.ipc`, () => {
    log.info(`Server: on listening for network - ${network}`);
  });

});

