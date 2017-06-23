const net = require('net'),
  config = require('./config'),
  request = require('request');

const server = net.createServer(stream => {

  stream.on('data', c => {
    request.post(`http://${config.web3.networks.development.host}:${config.web3.networks.development.port}`,
      {body: c.toString()}, (err, resp, body) => {
        stream.write(body);
      });
  });

/*  stream.on('end', () => {
    server.close();
  });*/

});

server.listen(config.web3.networks.development.ipc, () => {
  console.log('Server: on listening');
});