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

  //listen to newLoc event, and on emit - create a pin object for ipfs, by extracting hash from Loc
  ctx.events.on('NewLOC', args => {
    ctx.contracts_instances.LOCManager.getLOCByName(args.locName)
      .then(data => {
        let pin = new pinModel({
          hash: bytes32toBase58(data[4]),
          network: ctx.network
        });

        chain = chain.delay(1000).then(() => pin.save());
      });
  });

  //listen to HashUpdate event, and on emit - update a pin object for ipfs, by extracting hash from Loc
  ctx.events.on('HashUpdate', args => {
    chain = chain.delay(1000).then(() =>
      pinModel.update(
        {hash: args.oldHash, network: ctx.network},
        {updated: Date.now(), hash: args.newHash}
      )
    );
  });

  //initialize a scheduled ping service, which will perform pinning job on ipfs by hashes from pin collection
  scheduleService();

};