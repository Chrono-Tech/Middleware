const pinModel = require('./models/pinModel'),
  scheduleService = require('./services/scheduleService'),
  bytes32toBase58 = require('./helpers/bytes32toBase58');

/**
 * @module ipfs
 * @description listen for changes on smartContract's Loc hash,
 * update them in db in 'pins' collections, and runs a 'ping to ipfs' task
 * by scheduler
 * @param events events from all smartContracts
 * @param contracts instances of smartContracts
 */

module.exports = (events, contracts) => {

  events.on('NewLOC', args => {
    contracts.instances.LOCManager.getLOCByName(args.locName)
      .then(data => {
        let pin = new pinModel({hash: bytes32toBase58(data[4])});
        pin.save();
      });
  });

  events.on('HashUpdate', args => {
    pinModel.update(
      {hash: args.oldHash},
      {updated: Date.now(), hash: args.newHash}
    );
  });

  scheduleService();

};