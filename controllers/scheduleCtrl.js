const schedule = require('node-schedule'),
  models = require('../models'),
  ipfsAPI = require('ipfs-api'),
  _ = require('lodash'),
  config = require('../config.json');

module.exports = (sequelize) => {

  const ipfs_stack = config.nodes.map(node => ipfsAPI(node));
  const pinModel = models.pinModel(sequelize);

  schedule.scheduleJob(config.schedule.job, () => {
    pinModel.findAll({
      where: {
        $or: [
          {
            createdAt: {$lt: new Date(new Date() - config.schedule.check_time * 1000)}
          },
          {
            updatedAt: {$lt: new Date(new Date() - config.schedule.check_time * 1000)}
          }
        ]
      }
    }).then(records =>
      Promise.all(
        _.chain(records)
          .filter(r => r.hash)
          .map(r =>
            Promise.all(ipfs_stack.map(ipfs => ipfs.pin.add(r.hash)))
          )
          .value()
      )
    )
      .then(hashes =>
        pinModel.update(
          {updatedAt: new Date()},
          {where: {hash: {$in: _.map(hashes, hash => _.head(hash))}}}
        )
      )
      .catch(err => {
        console.log(err);
      })

  })

};