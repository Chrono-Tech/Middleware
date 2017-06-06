const config = require('../../config.json'),
  _ = require('lodash'),
  ipfsAPI = require('ipfs-api'),
  Promise = require('bluebird'),
  pinModel = require('../../plugins/ipfs/models/pinModel'),
  mongoose = require('mongoose'),
  helpers = require('../helpers'),
  parser = require('cron-parser'),
  moment = require('moment'),
  factory = {};

/** calculate delay between cron job + check time in ipfs daemon and current time,
 * so we could know, when daemon will be triggered next time
 */
const default_delay = moment(
    new Date(parser.parseExpression(config.schedule.job).next().toString())
  ).add(config.schedule.check_time + 120, 'seconds').diff(new Date());

jasmine.DEFAULT_TIMEOUT_INTERVAL = default_delay * 2;

beforeAll(() => {
  return mongoose.connect(config.mongo.uri);
});


afterAll(() =>
  pinModel.remove({
    hash: {$in: factory.hashes}
  })
    .then(() =>
      mongoose.disconnect()
    )
);


test('add 100 new records to ipfs', () => {

  let objs = _.chain(new Array(100))
    .map(a => {
      return {
        Data: new Buffer(helpers.generateRandomString()),
        Links: []
      }
    })
    .value();

  const ipfs_stack = config.nodes.map(node => ipfsAPI(node));

  return Promise.all(
    _.chain(ipfs_stack)
      .map(ipfs =>
        _.map(objs, o => ipfs.object.put(o))
      )
      .flattenDeep()
      .value()
  )
    .then(results => {
      factory.hashes = _.chain(results)
        .map(r => r.toJSON().multihash)
        .uniq()
        .value()
    })

});

test('add hashes to mongo', () =>
  Promise.delay(10000)
    .then(() =>
      Promise.all(
        _.map(factory.hashes, h =>
          (new pinModel({
            hash: h
          })).save()
        )
      )
    )
    .then(data => {
      let size = _.chain(data).map(data => data._id).compact().size().value();
      expect(size).toEqual(factory.hashes.length);
      return Promise.resolve();
    })
);

test('validate hashes in mongo', () =>
  pinModel.find({
    hash: {$in: factory.hashes}
  })
    .then(result => {
      expect(result.length).toEqual(factory.hashes.length);
      factory.pins = result;
      return Promise.resolve();
    })
);

test('validate ping result of daemon', () =>

  Promise.delay(default_delay)
    .then(() =>
      pinModel.find({
        hash: {$in: factory.hashes}
      })
    )
    .then(result => {

      let size = _.chain(result)
        .reject(r =>
          _.isEqual(r.created, r.updated)
        )
        .size()
        .value();

      expect(size).toEqual(factory.hashes.length);
      return Promise.resolve();
    })
);

