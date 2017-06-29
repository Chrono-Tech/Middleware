const net = require('net'),
  _ = require('lodash'),
  EventEmitter = require('events');

module.exports = (network) => {

  let emitter = new EventEmitter();
  let latestBlock;
  let blockWithTx;
  let delayResolver = _.debounce(() => {
    emitter.emit('txs', []);
  }, 5000);
  let client = net.createConnection(`${/^win/.test(process.platform) ? '\\\\.\\pipe\\' : '/tmp/'}${network}_geth.ipc`, () => {

    emitter.on('getBlock', () => {
      latestBlock = null;
      client.write('{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}');//get latest block
    });

    emitter.on('getTxs', block => {
      blockWithTx = null;
      client.write(`{"jsonrpc":"2.0","method":"eth_getBlockByNumber","params":["0x${(block).toString(16)}", true], "id":1}`);
      delayResolver(block);
    });

    emitter.emit('connected');

    client.on('data', (data) => {
      try {
        data = JSON.parse(data);
      } catch (e) {
      }

      if (_.get(data, 'result.transactions', []).length > 0 && !blockWithTx) {
        blockWithTx = data.result;
        data.result.transactions.forEach(tx =>
          client.write(`{"jsonrpc":"2.0","method":"eth_getTransactionReceipt","params":["${tx.hash}"],"id":1}`)
        );
        return;
      }

      //if (_.has(data, 'result.logs') && blockWithTx) {
      if (_.has(data, 'result.transactionHash') && blockWithTx) {
        let index = _.findIndex(blockWithTx.transactions, {hash: data.result.transactionHash});
        _.merge(blockWithTx.transactions[index], data.result);

        if (index === -1)
          return emitter.emit('txs', []);

        if (index === blockWithTx.transactions.length - 1) {
          emitter.emit('txs', blockWithTx.transactions);
          delayResolver.cancel();
        }

        return;
      }

      if (!latestBlock) {
        latestBlock = parseInt(data.result, 16);
        return emitter.emit('block', latestBlock);
      }

    });

  });

  return {events: emitter, client: client};

};