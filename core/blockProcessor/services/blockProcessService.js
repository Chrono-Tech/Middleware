const _ = require('lodash'),
  Promise = require('bluebird'),
  filterTxsByAccountService = require('./filterTxsByAccountService'),
  filterTxsBySMEventsService = require('./filterTxsBySMEventsService');

module.exports = async (currentBlock, web3) => {

  let block = await Promise.promisify(web3.eth.getBlockNumber)();

  if (block <= currentBlock)
    return Promise.reject({code: 0});

  let rawBlock = await Promise.promisify(web3.eth.getBlock)(currentBlock + 1, true);

  if (!rawBlock.transactions || _.isEmpty(rawBlock.transactions))
    return Promise.reject({code: 2});

  let txs = await Promise.map(rawBlock.transactions, tx =>
    parseInt(tx.value) > 0 ?
      tx : Promise.promisify(web3.eth.getTransactionReceipt)(tx.hash), {concurrency: 1});

  let filteredTxs = await filterTxsByAccountService(txs);
  let filteredEvents = await filterTxsBySMEventsService(txs, web3);

  return {
    txs: filteredTxs,
    events: filteredEvents
  };

};