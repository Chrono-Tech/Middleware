const config = require('../../config'),
  _ = require('lodash'),
  ipfsAPI = require('ipfs-api'),
  Promise = require('bluebird'),
  expect = require('chai').expect,
  pinModel = require('../../core/ipfs/models/pinModel'),
  mongoose = require('mongoose'),
  helpers = require('../helpers'),
  parser = require('cron-parser'),
  moment = require('moment'),
  ctx = {};

/** calculate delay between cron job + check time in ipfs daemon and current time,
 * so we could know, when daemon will be triggered next time
 */

module.exports = () => {

  const default_delay = moment(
    new Date(parser.parseExpression(config.schedule.job).next().toString())
  ).add(config.schedule.checkTime + 120, 'seconds').diff(new Date());

  it('add 100 new records to ipfs', async () => {

    let objs = _.chain(new Array(100))
      .map(() => {
        return {
          Data: new Buffer(helpers.generateRandomString()),
          Links: []
        }
      })
      .value();

    const ipfs_stack = config.nodes.map(node => ipfsAPI(node));

    let results = await Promise.all(
      _.chain(ipfs_stack)
        .map(ipfs =>
          _.map(objs, o => ipfs.object.put(o))
        )
        .flattenDeep()
        .value()
    );
    ctx.hashes = _.chain(results)
      .map(r => r.toJSON().multihash)
      .uniq()
      .value()

  });

  it('add hashes to mongo', async () => {
    await Promise.delay(10000);

    let data = await Promise.all(
      _.map(ctx.hashes, h =>
        (new pinModel({
          hash: h
        })).save()
      )
    );

    let size = _.chain(data).map(data => data._id).compact().size().value();
    expect(size).to.equal(ctx.hashes.length);

  });

  it('validate hashes in mongo', async () => {
    ctx.pins = await pinModel.find({
      hash: {$in: ctx.hashes}
    });

    expect(ctx.pins.length).to.equal(ctx.hashes.length);

  });

  it('validate ping result of daemon', async () => {
    await Promise.delay(default_delay);

    let result = await pinModel.find({
      hash: {$in: ctx.hashes}
    });

    let size = _.chain(result)
      .reject(r =>
        _.isEqual(r.created, r.updated)
      )
      .size()
      .value();

    expect(size).to.equal(ctx.hashes.length);

  }).timeout(default_delay * 2);

};