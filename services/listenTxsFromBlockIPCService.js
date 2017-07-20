const net = require('net'),
  _ = require('lodash'),
  bunyan = require('bunyan'),
  log = bunyan.createLogger({name: 'services.listenTxsFromBlockIPCService'}),
  EventEmitter = require('events');

module.exports = (network) => {

  let emitter = new EventEmitter();
  let ctx = {
    status: 0,
    wrong_count: 0
  };

  let client = net.createConnection(`${/^win/.test(process.platform) ? '\\\\.\\pipe\\' : '/tmp/'}${network}/geth.ipc`, () => {

    let reply = (data) => {

      if (ctx.status === 0)
        return emitter.emit('block', parseInt(_.get(data, 'result', -1), 16));

      if (ctx.status === 1)
        return emitter.emit('txs', _.get(data, 'result.transactions', []));

      if (ctx.status === 2)
        return emitter.emit('txReceipt', _.get(data, 'result', {}));
    };

    let timeout = _.debounce(reply, 1000);

    emitter.on('getBlock', () => {
      ctx.status = 0;
      client.resume();
      timeout();
      client.write('{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}');//get latest block
    });

    emitter.on('getTxs', block => {
      ctx.status = 1;
      ctx.block = block;
      client.resume();
      timeout();
      client.write(`{"jsonrpc":"2.0","method":"eth_getBlockByNumber","params":["0x${(block).toString(16)}", true], "id":1}`);
    });

    emitter.on('getTxReceipt', tx => {
      ctx.status = 2;
      ctx.tx = tx;
      client.resume();
      timeout();
      client.write(`{"jsonrpc":"2.0","method":"eth_getTransactionReceipt","params":["${tx.hash}"],"id":1}`);
    });

    emitter.emit('connected');

    client.on('data', (data) => {

      timeout.cancel();
      client.pause();
      try {
        data = JSON.parse(data);
      } catch (e) {

        if (ctx.wrong_count > 5) {
          ctx.wrong_count = 0;
          return reply();
        }

        ctx.wrong_count++;
        client.resume();

        if (ctx.status === 0)
          return client.write('{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}');

        if (ctx.status === 1)
          return client.write(`{"jsonrpc":"2.0","method":"eth_getBlockByNumber","params":["0x${(ctx.block).toString(16)}", true], "id":1}`);

        if (ctx.status === 2)
          return client.write(`{"jsonrpc":"2.0","method":"eth_getTransactionReceipt","params":["${ctx.tx.hash}"],"id":1}`);

      }

      reply(data);

    });

  });

  return {events: emitter, client: client};

};