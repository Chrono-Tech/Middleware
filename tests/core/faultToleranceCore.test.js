const config = require('../../config'),
  _ = require('lodash'),
  ipfsAPI = require('ipfs-api'),
  Promise = require('bluebird'),
  helpers = require('../helpers'),
  blockModel = require('../../models').blockModel,
  contractsCtrl = require('../../controllers').contractsCtrl,
  eventsCtrl = require('../../controllers').eventsCtrl,
  mongoose = require('mongoose'),
  ctx = {
    contracts_instances: {},
    factory: {
      block: null,
      BCE: {},
      count: null
    },
    contracts: {},
    accounts: [],
    eventModels: {},
    web3: null
  };

jasmine.DEFAULT_TIMEOUT_INTERVAL = 70000;

beforeAll(() => {
  return contractsCtrl('development')
    .then((data) => {
      ctx.contracts_instances = data.instances;
      ctx.contracts = data.contracts;
      ctx.web3 = data.web3;
      ctx.eventModels = eventsCtrl(data.instances, data.web3).eventModels;

      return new Promise(res => {
        ctx.web3.eth.getAccounts((err, result) => res(result));
      })
    })
    .then(accounts => {
      ctx.accounts = accounts;
      return mongoose.connect(config.mongo.uri);
    })
    .then(() => helpers.awaitLastBlock(ctx))
});

afterAll(() => {
  ctx.web3.currentProvider.connection.end();
  return mongoose.disconnect();
});

test('validate block exist in mongo', () =>
  blockModel
    .findOne({network: 'development'})
    .then(result => {
      expect(result).toBeDefined();
      expect(result.block).toBeDefined();
      ctx.factory.block = result.block;
      return Promise.resolve();
    })
);

test('validate block exist in mongo', () =>

  blockModel
    .findOne({network: 'development'})
    .then(result => {
      expect(result).toBeDefined();
      expect(result.block).toBeDefined();
      ctx.factory.block = result.block;
      return Promise.resolve();
    })
);

test('add new CBE', () => {

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
      ctx.factory.BCE = {
        hash: helpers.bytes32fromBase58(data[0].toJSON().multihash)
      };

      return ctx.contracts_instances.UserManager.getCBEMembers({from: ctx.accounts[0]});
    })
    .then((accounts) => {

      ctx.factory.BCE.account = _.chain(ctx.accounts)
        .without(...accounts[0])
        .head()
        .value();

      expect(ctx.factory.BCE.account).toBeDefined();

      return ctx.contracts_instances.UserManager.addCBE(
        ctx.factory.BCE.account,
        ctx.factory.BCE.hash,
        {from: ctx.accounts[0]}
      )
    })
    .then(result => {

      expect(result).toBeDefined();
      expect(result.tx).toBeDefined();
      return Promise.resolve();
    })
});

test('validate hash and count of records in mongo', () =>
  Promise.delay(30000)
    .then(() =>
      ctx.eventModels.SetHash.find({})
    )
    .then(result => {
      let item = _.find(result, {newHash: ctx.factory.BCE.hash});
      ctx.count = result.length;
      expect(item).toBeDefined();
      expect(item.newHash).toBeDefined();
      return Promise.resolve();
    })
);

test('reset block to 0', () =>
  blockModel
    .update({network: 'development'}, {$set: {block: 0}})
    .then(result => {
      expect(result).toBeDefined();
      return Promise.resolve();
    })
);

test('validate hash and count of records in mongo after resetting block', () =>
  Promise.delay(60000)
    .then(() =>
      ctx.eventModels.SetHash.find({})
    )
    .then(result => {
      expect(result.length).toBe(ctx.count);
      return Promise.resolve();
    })
);



test('add new CBE - again', () => {

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
      ctx.factory.BCE = {
        hash: helpers.bytes32fromBase58(data[0].toJSON().multihash)
      };

      return ctx.contracts_instances.UserManager.getCBEMembers({from: ctx.accounts[0]});
    })
    .then((accounts) => {

      ctx.factory.BCE.account = _.chain(ctx.accounts)
        .without(...accounts[0])
        .head()
        .value();

      expect(ctx.factory.BCE.account).toBeDefined();

      return ctx.contracts_instances.UserManager.addCBE(
        ctx.factory.BCE.account,
        ctx.factory.BCE.hash,
        {from: ctx.accounts[0]}
      )
    })
    .then(result => {

      expect(result).toBeDefined();
      expect(result.tx).toBeDefined();
      return Promise.resolve();
    })
});


test('validate block became actual', () =>
  Promise.delay(60000)
    .then(() =>
      blockModel.findOne({network: 'development'})
    )
    .then(result => {
      expect(result.block).toBeGreaterThan(ctx.factory.block);
      return Promise.resolve();
    })
);