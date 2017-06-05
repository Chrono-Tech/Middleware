const config = require('../../config.json'),
  _ = require('lodash'),
  ipfsAPI = require('ipfs-api'),
  Promise = require('bluebird'),
  pinModel = require('../../plugins/ipfs/models/pinModel'),
  mongoose = require('mongoose'),
  helpers = require('../helpers'),
  factory = {};

jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000 * 50; // 10 second timeout

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

  Promise.delay(60000)
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

