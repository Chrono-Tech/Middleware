const net = require('net'),
  _ = require('lodash'),
  bunyan = require('bunyan'),
  log = bunyan.createLogger({name: 'services.listenTxsFromBlockIPCService'}),
  EventEmitter = require('events');

module.exports = (network) => {

  let emitter = new EventEmitter();
  let ctx = {
    status: 0
  };

  let client = net.createConnection(`${/^win/.test(process.platform) ? '\\\\.\\pipe\\' : '/tmp/'}${network}/geth.ipc`, () => {

    emitter.on('getBlock', () => {
      ctx.status = 0;
      client.write('{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}');//get latest block
    });

    emitter.on('getTxs', block => {
      ctx.status = 1;
      ctx.block = block;
      client.write(`{"jsonrpc":"2.0","method":"eth_getBlockByNumber","params":["0x${(block).toString(16)}", true], "id":1}`);
    });

    emitter.on('getTxReceipt', tx => {
      ctx.status = 2;
      ctx.tx = tx;
      client.write(`{"jsonrpc":"2.0","method":"eth_getTransactionReceipt","params":["${tx.hash}"],"id":1}`);
    });

    emitter.emit('connected');

    client.on('data', (data) => {
      try {
        data = JSON.parse(data);
      } catch (e) {

        if (ctx.status === 0)
          return emitter.emit('block', -1);

        if (ctx.status === 1)
          return client.write(`{"jsonrpc":"2.0","method":"eth_getBlockByNumber","params":["0x${(ctx.block).toString(16)}", true], "id":1}`);

        if (ctx.status === 2)
          return client.write(`{"jsonrpc":"2.0","method":"eth_getTransactionReceipt","params":["${ctx.tx.hash}"],"id":1}`);
      }

      if (ctx.status === 0)
        return emitter.emit('block', parseInt(data.result, 16));

      if (ctx.status === 1)
        return emitter.emit('txs', data.result.transactions);

      if (ctx.status === 2)
        return emitter.emit('txReceipt', data.result);

    });

  });

  return {events: emitter, client: client};

};