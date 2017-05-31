const schedule = require('node-schedule'),
  pinModel = require('../models/pinModel'),
  ipfsAPI = require('ipfs-api'),
  _ = require('lodash'),
  config = require('../../../config.json');

module.exports = () => {

  const ipfs_stack = config.nodes.map(node => ipfsAPI(node));

  schedule.scheduleJob(config.schedule.job, () => {
    pinModel.find({
        $or: [
          {
            createdAt: {$lt: new Date(new Date() - config.schedule.check_time * 1000)}
          },
          {
            updatedAt: {$lt: new Date(new Date() - config.schedule.check_time * 1000)}
          }
        ]

    })
      .then(records =>
      Promise.all(
        _.chain(records)
          .filter(r => r.hash)
          .map(r =>
            Promise.all(ipfs_stack.map(ipfs => ipfs.pin.add(r.hash)))
          )
          .value()
      )
    )
      .then(hashes =>{
        pinModel.update(
          {hash: {$in: _.map(hashes, hash => _.head(hash))}},
          {$set: {updatedAt: new Date()}}
        )
  })
      .catch(err => {
        console.log(err);
      })

  })

};