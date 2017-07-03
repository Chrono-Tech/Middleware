const pinModel = require('./models/pinModel'),
  Promise = require('bluebird'),
  scheduleService = require('./services/scheduleService'),
  bytes32toBase58 = require('./helpers/bytes32toBase58');

/**
 * @module ipfs
 * @description listen for changes on smartContract's Loc hash,
 * update them in db in 'pins' collections, and runs a 'ping to ipfs' task
 * by scheduler
 * @param ctx - context of app, includes {
 *    events: *,
 *    contracts_instances: *,
 *    eventModels: *,
 *    contracts: *
 *    network: *
 *    }
 */

module.exports = (ctx) => {

  let chain = Promise.resolve();

  //listen to HashUpdate event, and on emit - update a pin object for ipfs, by extracting hash from Loc
  ctx.events.on('SetHash', args => {
    chain = chain.delay(1000).then(() =>
      pinModel.update(
        {hash: bytes32toBase58(args.oldHash), network: ctx.network},
        {updated: Date.now(), hash: bytes32toBase58(args.newHash), network: ctx.network},
        {upsert: true, setDefaultsOnInsert: true}
      )
    );
  });

  //initialize a scheduled ping service, which will perform pinning job on ipfs by hashes from pin collection
  scheduleService();

};