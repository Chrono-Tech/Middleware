const config = require('../../config'),
  _ = require('lodash'),
  ipfsAPI = require('ipfs-api'),
  Promise = require('bluebird'),
  helpers = require('../helpers'),
  contractsCtrl = require('../../controllers').contractsCtrl,
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
    web3: null
  };

jasmine.DEFAULT_TIMEOUT_INTERVAL = 80000;

beforeAll(() => {
  return contractsCtrl(config.web3.networks.development)
    .then((data) => {
      ctx.contracts_instances = data.instances;
      ctx.contracts = data.contracts;
      ctx.web3 = data.web3;

      return new Promise(res => {
        ctx.web3.eth.getAccounts((err, result) => res(result));
      })
    })
    .then(accounts => {
      ctx.accounts = accounts;
      return mongoose.connect(config.mongo.uri);

    })
});

afterAll(() =>
  mongoose.disconnect()
);

test('validate block exist in mongo', () =>

  mongoose.model('block', new mongoose.Schema({
      block: {type: Number},
      network: {type: String}
    }
  ))
    .findOne({network: 'development'})
    .then(result => {
      expect(result).toBeDefined();
      expect(result.block).toBeDefined();
      ctx.factory.block = result.block;
      return Promise.resolve();
    })
);

test('validate block exist in mongo', () =>

  mongoose.model('block')
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
  Promise.delay(20000)
    .then(() =>
      mongoose.model('SetHash', new mongoose.Schema({
          newHash: {type: mongoose.Schema.Types.Mixed}
        }
      )).find()
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
  mongoose.model('block')
    .update({network: 'development'}, {$set: {block: 0}})
    .then(result => {
      expect(result).toBeDefined();
      return Promise.resolve();
    })
);



test('validate hash and count of records in mongo after resetting block', () =>
  Promise.delay(60000)
    .then(() =>
      mongoose.model('SetHash').find()
    )
    .then(result => {
      expect(result.length).toBe(ctx.count);
      return Promise.resolve();
    })
);