const _ = require ('lodash'),
  Promise = require ('bluebird'),
  filterTxsByAccountService = require ('./filterTxsByAccountService'),
  filterTxsBySMEventsService = require ('./filterTxsBySMEventsService');

module.exports = async (currentBlock, web3) => {

  let block = await Promise.promisify (web3.eth.getBlockNumber) ();

  if (block <= currentBlock)
    return Promise.reject ({code: 0});

  let raw_block = await Promise.promisify (web3.eth.getBlock) (currentBlock + 1, true);

  if (!raw_block.transactions || _.isEmpty (raw_block.transactions))
    return Promise.reject ({code: 2});

  let txs = await Promise.map (raw_block.transactions, tx =>
    parseInt (tx.value) > 0 ?
      tx : Promise.promisify (web3.eth.getTransactionReceipt) (tx.hash), {concurrency: 1});

  let filteredTxs = await filterTxsByAccountService (txs);
  let filteredEvents = await filterTxsBySMEventsService (txs, web3);

  return {
    balance: filteredTxs,
    events: filteredEvents
  };

};