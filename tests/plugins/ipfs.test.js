const config = require('../../config'),
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

afterAll(async() => {
  await pinModel.remove({
    hash: {$in: factory.hashes}
  });

  return mongoose.disconnect();
});

test('add 100 new records to ipfs', async() => {

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
  factory.hashes = _.chain(results)
    .map(r => r.toJSON().multihash)
    .uniq()
    .value()

});

test('add hashes to mongo', async() => {
  await Promise.delay(10000);

  let data = await Promise.all(
    _.map(factory.hashes, h =>
      (new pinModel({
        hash: h
      })).save()
    )
  );

  let size = _.chain(data).map(data => data._id).compact().size().value();
  expect(size).toEqual(factory.hashes.length);

});

test('validate hashes in mongo', async() => {
  let result = await pinModel.find({
    hash: {$in: factory.hashes}
  });

  expect(result.length).toEqual(factory.hashes.length);
  factory.pins = result;

});

test('validate ping result of daemon', async() => {
  await Promise.delay(default_delay);

  let result = await pinModel.find({
    hash: {$in: factory.hashes}
  });

  let size = _.chain(result)
    .reject(r =>
      _.isEqual(r.created, r.updated)
    )
    .size()
    .value();

  expect(size).toEqual(factory.hashes.length);

});