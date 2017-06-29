const net = require('net'),
  config = require('./config'),
  request = require('request');

const server = net.createServer(stream => {

  stream.on('data', c => {
    request.post(`http://${config.web3.networks.development.host}:${config.web3.networks.development.port}`,
      {body: c.toString()}, (err, resp, body) => {
        try {
          console.log('body')
          console.log(c.toString());
          JSON.parse(body);
          console.log(body);
          stream.write(body);
        } catch (e) {
        }
      });
  });

});

server.listen(`${/^win/.test(process.platform) ? '\\\\.\\pipe\\' : '/tmp/'}development_geth.ipc`, () => {
  console.log('Server: on listening');
});