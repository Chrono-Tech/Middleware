const pinModel = require('./models/pinModel'),
  _ = require('lodash'),
  scheduleService = require('./services/scheduleService'),
  bytes32toBase58 = require('./helpers/bytes32toBase58');

/**
 * @module ipfs
 * @description listen for changes on smartContract's Loc hash,
 * update them in db in 'pins' collections, and runs a 'ping to ipfs' task
 * by scheduler
 * @param ctx - context of app, includes {events: *,
 *    contracts_instances: *,
 *    eventModels: *,
 *    contracts: *}
 */

module.exports = (ctx) => {

  let chain = Promise.resolve();

  ctx.events.on('NewLOC', args => {
    ctx.contract_instances.LOCManager.getLOCByName(args.locName)
      .then(data => {
        let pin = new pinModel({
          hash: bytes32toBase58(data[4]),
          network: ctx.network
        });

        chain = chain.delay(1000).then(() => pin.save());
      });
  });

  ctx.events.on('HashUpdate', args => {
    chain = chain.delay(1000).then(() =>
      pinModel.update(
        {hash: args.oldHash, network: ctx.network},
        {updated: Date.now(), hash: args.newHash}
      )
    );
  });

  scheduleService();

};