const _ = require('lodash'),
  blockModel = require('../models').blockModel,
  accountModel = require('../models').accountModel,
  transactionModel = require('../models').transactionModel,
  Promise = require('bluebird'),
  aggregateTxsByBlockService = require('./aggregateTxsByBlockService');

module.exports = async(txService, currentBlock, contract_instances, event_ctx, eventEmitter, accounts, network) => {
  let block = await new Promise(res => {
    txService.events.emit('getBlock');
    txService.events.once('block', block => {
      res(block);
    });
  });

  if (block === -1)
    return Promise.reject({code: 1});

  if (block < currentBlock)
    return Promise.reject({code: 0});

  txService.events.emit('getTxs', currentBlock++);

  let txs = await new Promise((resolve) => {
    txService.events.once('txs', resolve);
  });

  if (!txs || _.isEmpty(txs))
    return Promise.reject({code: 2});

  txs = await Promise.map(txs, tx => {
    return parseInt(tx.value) > 0 ?
      tx : new Promise(res => {
        txService.events.emit('getTxReceipt', tx);
        txService.events.once('txReceipt', res);
      });
  }, {concurrency: 1});

  let res = aggregateTxsByBlockService(txs,
    [contract_instances.MultiEventsHistory.address, /*contract_instances.EventsHistory.address*/],
    event_ctx.signatures,
    accounts,
    network
  );

  await Promise.all(
    _.chain(res)
      .get('events')
      .map(ev =>
        ev.event === 'NewUserRegistered' ? new event_ctx.eventModels[ev.event](_.merge(ev.args, {network: network})).save()
          .then(() => new accountModel({network: network, address: ev.args.key}).save())
          .then(() => accounts.push(ev.args.key))
          .catch(()=>{}) :
          new event_ctx.eventModels[ev.event](_.merge(ev.args, {network: network})).save()
            .catch(()=>{})
      )
      .union([transactionModel.insertMany(res.txs)])
      .value()
  );

  _.chain(res)
    .get('events')
    .forEach(ev => {
      eventEmitter.emit(ev.event, ev.args);
    })
    .value();

  await blockModel.findOneAndUpdate({network: network}, {
    $set: {
      block: currentBlock,
      created: Date.now()
    }
  }, {upsert: true});

  return Promise.resolve();

};