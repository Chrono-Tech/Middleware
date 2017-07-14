const net = require('net'),
  _ = require('lodash'),
  bunyan = require('bunyan'),
  log = bunyan.createLogger({name: 'services.listenTxsFromBlockIPCService'}),
  EventEmitter = require('events');

module.exports = (network) => {

  let emitter = new EventEmitter();
  let latestBlock;
  let blockWithTx;
  let status = 0; //0 - block, 1 - tx payload, 2 - tx itself

  let client = net.createConnection(`${/^win/.test(process.platform) ? '\\\\.\\pipe\\' : '/tmp/'}${network}/geth.ipc`, () => {

    emitter.on('getBlock', () => {
      latestBlock = null;
      status = 0;
      client.write('{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}');//get latest block
      //delayBlockResolver();
    });

    emitter.on('getTxs', block => {
      blockWithTx = null;
      status = 1;
      client.write(`{"jsonrpc":"2.0","method":"eth_getBlockByNumber","params":["0x${(block).toString(16)}", true], "id":1}`);
    });

    emitter.emit('connected');

    client.on('data', (data) => {
      try {
        data = JSON.parse(data);
      } catch (e) {
        //log.error(e);

        if (status === 0)
          return emitter.emit('block', -1);

        if (status === 2)
          blockWithTx.transactions.forEach(tx => {
            if (!_.has(tx, 'logs'))
              return client.write(`{"jsonrpc":"2.0","method":"eth_getTransactionReceipt","params":["${tx.hash}"],"id":1}`);
          });

        return emitter.emit('txs', []);
      }

      if (status === 1 && _.get(data, 'result.transactions', []).length > 0) {
        blockWithTx = data.result;
        status = 2;
        data.result.transactions.forEach(tx => {
          if (!_.has(tx, 'logs'))
            client.write(`{"jsonrpc":"2.0","method":"eth_getTransactionReceipt","params":["${tx.hash}"],"id":1}`);
        });
        return;
      }

      if (status === 2 && _.has(data, 'result.transactionHash') && blockWithTx) {
        let index = _.findIndex(blockWithTx.transactions, {hash: data.result.transactionHash});
        //console.log(data.result)
        _.merge(blockWithTx.transactions[index], data.result);

        if (index === -1)
          return emitter.emit('txs', []);

        if (index === blockWithTx.transactions.length - 1) {
          emitter.emit('txs', blockWithTx.transactions);
        }

        return;
      }

      if (status === 0) {
        latestBlock = parseInt(data.result, 16);
        return emitter.emit('block', latestBlock);
      }

      return emitter.emit('txs', []);

    });

  });

  return {events: emitter, client: client};

};