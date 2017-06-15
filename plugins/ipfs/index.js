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

  _.forEach(ctx.contracts_instances, (data, network) => {
    let contract_instances = data.contracts;
    ctx.events.on(`NewLOC:${network}`, args => {
      contract_instances.LOCManager.getLOCByName(args.locName)
        .then(data => {
          let pin = new pinModel({
            hash: bytes32toBase58(data[4]),
            network: network
          });
          pin.save();
        });
    });

    ctx.events.on(`HashUpdate:${network}`, args => {
      pinModel.update(
        {hash: args.oldHash, network: network},
        {updated: Date.now(), hash: args.newHash}
      );
    });
  });

  scheduleService();

};