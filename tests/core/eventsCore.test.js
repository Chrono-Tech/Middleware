const config = require('../../config'),
  _ = require('lodash'),
  ipfsAPI = require('ipfs-api'),
  Promise = require('bluebird'),
  helpers = require('../helpers'),
  contractsCtrl = require('../../controllers').contractsCtrl,
  eventsCtrl = require('../../controllers').eventsCtrl,
  mongoose = require('mongoose'),
  ctx = {
    contracts_instances: {},
    factory: {},
    contracts: {},
    eventModels: {},
    web3: null
  };

jasmine.DEFAULT_TIMEOUT_INTERVAL = 180000;

beforeAll(() => {
  return contractsCtrl('development')
    .then((data) => {
      ctx.contracts_instances = data.instances;
      ctx.contracts = data.contracts;
      ctx.web3 = data.web3;
      ctx.eventModels = eventsCtrl(data.instances, data.web3).eventModels;
      return mongoose.connect(config.mongo.uri);
    })
    .then(() => helpers.awaitLastBlock(ctx))
});

afterAll(() => {
  ctx.web3.currentProvider.connection.end();
  return mongoose.disconnect();
});

test('add new loc', () => {

  const obj = {
    Data: new Buffer(helpers.generateRandomString()),
    Links: []
  };
  const ipfs_stack = config.nodes.map(node => ipfsAPI(node));

  return Promise.all(
    _.chain(ipfs_stack)
      .map(ipfs =>
        ipfs.object.put(obj)
      )
      .value()
  )
    .then((data) => {
      ctx.factory.Loc = {
        name: helpers.bytes32(helpers.generateRandomString()),
        website: helpers.bytes32("www.ru"),
        issueLimit: 1000000,
        hash: helpers.bytes32fromBase58(data[0].toJSON().multihash),
        expDate: Math.round(+new Date() / 1000),
        currency: helpers.bytes32('LHT')
      };

      return new Promise(res => {
        ctx.web3.eth.getCoinbase((err, result) => res(result));
      })
    })
    .then((coinbase) =>
      ctx.contracts_instances.LOCManager.addLOC(
        ctx.factory.Loc.name,
        ctx.factory.Loc.website,
        ctx.factory.Loc.issueLimit,
        ctx.factory.Loc.hash,
        ctx.factory.Loc.expDate,
        ctx.factory.Loc.currency,
        {from: coinbase}
      )
    )
    .then(result => {
      expect(result).toBeDefined();
      expect(result.tx).toBeDefined();
      return Promise.resolve();
    })
});

test('validate hash in mongo', () =>
  Promise.delay(20000)
    .then(() =>
      ctx.eventModels.NewLOC.findOne({locName: ctx.factory.Loc.name})
    )
    .then(result => {
      expect(result).toBeDefined();
      expect(result.locName).toBeDefined();
      return Promise.resolve();
    })
);

test('update loc', () => {

  const obj = {
    Data: new Buffer(helpers.generateRandomString()),
    Links: []
  };
  const ipfs_stack = config.nodes.map(node => ipfsAPI(node));

  Promise.all(
    _.chain(ipfs_stack)
      .map(ipfs =>
        ipfs.object.put(obj)
      )
      .value()
  )
    .then((data) => {
      ctx.factory.Loc.old_hash = ctx.factory.Loc.hash;
      ctx.factory.Loc.hash = helpers.bytes32fromBase58(data[0].toJSON().multihash);

      return new Promise(res => {
        ctx.web3.eth.getCoinbase((err, result) => res(result));
      })
    })
    .then(coinbase =>
      ctx.contracts_instances.LOCManager.setLOC(
        ctx.factory.Loc.name,
        ctx.factory.Loc.name,
        ctx.factory.Loc.website,
        ctx.factory.Loc.issueLimit,
        ctx.factory.Loc.hash,
        ctx.factory.Loc.expDate,
        {from: coinbase}
      )
    )
    .then(result => {
      expect(result).toBeDefined();
      expect(result.tx).toBeDefined();
      return Promise.resolve();
    })
});

test('fetch changes for loc via HashUpdate event', () =>
  new Promise(res => {
    ctx.contracts.LOCManager.at(ctx.contracts_instances.MultiEventsHistory.address)
      .allEvents({fromBlock: 0}).watch((err, result) => {
      if (result && result.event === 'HashUpdate' && result.args.newHash === ctx.factory.Loc.hash) {
        res();
      }
    });
  })
);

test('validate new hash in mongo', () =>
  Promise.delay(20000)
    .then(() =>
      ctx.eventModels.HashUpdate
        .findOne({oldHash: ctx.factory.Loc.old_hash, newHash: ctx.factory.Loc.hash})
    )
    .then(result => {
      expect(result).toBeDefined();
      return Promise.resolve();
    })
);

