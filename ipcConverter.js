const net = require('net'),
  config = require('chronobank-smart-contracts/truffle'),
  bunyan = require('bunyan'),
  fs = require('fs'),
  log = bunyan.createLogger({name: 'ipcConverter'}),
  _ = require('lodash'),
  request = require('request'),
  TestRPC = require('ethereumjs-testrpc');

let RPCServer = TestRPC.server();
RPCServer.listen(8545);

_.keys(config.networks).forEach((network) => {

  const server = net.createServer(stream => {

    stream.on('data', c => {
      request.post(`http://${config.networks[network].host}:${config.networks[network].port}`,
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

