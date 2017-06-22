const net = require('net'),
  path = require('path'),
  _ = require('lodash'),
  EventEmitter = require('events');

module.exports = () => {

  let emitter = new EventEmitter();
  let latestBlock;
  let currentTx;
  let client = net.createConnection(path.join('\\\\.\\pipe', 'geth.ipc'), () => {

    emitter.on('getBlock', () => {
      latestBlock = null;
      client.write('{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}');//get latest block
    });

    emitter.on('getTx', block => {
      client.write(`{"jsonrpc":"2.0","method":"eth_getBlockByNumber","params":["0x${(block).toString(16)}", true], "id":1}`);
    });

    emitter.emit('connected');

    client.on('data', (data) => {
      try {
        data = JSON.parse(data);
      } catch (e) {
        return emitter.emit('tx');
      }

      if (_.get(data, 'result.transactions', []).length > 0) {
        //console.log(data.result);
        currentTx = data.result;
        data.result.transactions.forEach(tx =>
          client.write(`{"jsonrpc":"2.0","method":"eth_getTransactionReceipt","params":["${tx.hash}"],"id":1}`)
        );
        return;
      }

      if (_.has(data, 'result.logs')) {
        data.result.value = _.chain(currentTx.transactions)
          .find({hash: data.result.transactionHash})
          .get('value')
          .value();
        return emitter.emit('tx', data.result);
      }

      if (!latestBlock) {
        latestBlock = parseInt(data.result, 16);
        return emitter.emit('block', latestBlock);
      }

      return emitter.emit('tx');

    });

  });

  return {events: emitter, client: client};

};