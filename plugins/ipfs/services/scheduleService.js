const schedule = require('node-schedule'),
  pinModel = require('../models/pinModel'),
  ipfsAPI = require('ipfs-api'),
  _ = require('lodash'),
  bunyan = require('bunyan'),
  config = require('../../../config.json'),
  Promise = require('bluebird'),
  log = bunyan.createLogger({name: 'plugins.ipfs.scheduleService'});

/**
 * @module scheduleService
 * @description ping ipfs by specified time in config
 * @see {@link ../../../config.json}
 */

module.exports = () => {

  const ipfs_stack = config.nodes.map(node => ipfsAPI(node));

  schedule.scheduleJob(config.schedule.job, () => {
    pinModel.find({
      updated: {$lt: new Date(new Date() - config.schedule.check_time * 1000)}
    })
      .then(records =>
        Promise.all(
          _.chain(records)
            .filter(r => r.hash)
            .map(r =>
              Promise.all(
                ipfs_stack.map(ipfs =>
                  Promise.delay(1000)
                    .then(() => ipfs.pin.add(r.hash))
                    .timeout(30000)
                    .catch(err => {
                      log.error(err);
                    })
                )
              )
            )
            .value()
        )
      )
      .then(hashes =>
        pinModel.update(
          {hash: {$in: _.chain(hashes).flattenDeep().uniq().value()}},
          {$currentDate: {updated: true}},
          {multi: true}
        )
      )
      .catch(err => {
        log.error(err);
      });

  });

};