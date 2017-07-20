const config = require('../../config'),
  _ = require('lodash'),
  ipfsAPI = require('ipfs-api'),
  Promise = require('bluebird'),
  helpers = require('../helpers'),
  accountModel = require('../../models').accountModel,
  transactionModel = require('../../models').transactionModel,
  contractsCtrl = require('../../controllers').contractsCtrl,
  eventsCtrl = require('../../controllers').eventsCtrl,
  mongoose = require('mongoose'),
  ctx = {
    contracts_instances: {},
    factory: {
      BCE: {},
      nonBCE: {}
    },
    contracts: {},
    accounts: [],
    eventModels: {},
    web3: null
  };

jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

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

test('fetch changes via SetHash event', () =>
  new Promise(res => {
    ctx.contracts.UserManager.at(ctx.contracts_instances.MultiEventsHistory.address)
      .allEvents({fromBlock: 0}).watch((err, result) => {
      if (result && result.event === 'SetHash') {
        expect(result.args.newHash).toBeDefined();
        if (result.args.newHash === ctx.factory.BCE.hash)
          res();
      }
    });
  })
);

test('validate hash in mongo', () =>
  Promise.delay(20000)
    .then(() =>
      ctx.eventModels.SetHash
        .findOne({newHash: ctx.factory.BCE.hash})
    )
    .then(result => {
      expect(result).toBeDefined();
      expect(result.newHash).toBeDefined();
      return Promise.resolve();
    })
);

test('validate account in mongo', () =>
  Promise.delay(20000)
    .then(() =>
      accountModel.findOne({address: ctx.factory.BCE.account})
    )
    .then(result => {
      expect(result).toBeDefined();
      expect(result.address).toBeDefined();
      return Promise.resolve();
    })
);

test('create tx for user', () =>
  new Promise(res => {
    ctx.web3.eth.sendTransaction({
      from: ctx.factory.BCE.account,
      to: ctx.factory.BCE.account,
      value: ctx.web3.toWei(0.05, 'ether')
    }, (err, address) => {
      res(address);
    });
  })
    .then(result => {
      expect(result).toBeDefined();
      return Promise.resolve();
    })
);

test('validate tx in mongo', () =>
  Promise.delay(20000)
    .then(() =>
      transactionModel.findOne({from: ctx.factory.BCE.account})
    )
    .then(result => {
      expect(result).toBeDefined();
      expect(result.from).toBeDefined();
      return Promise.resolve();
    })
);

test('create tx for not authorized on platform user', () =>

  ctx.contracts_instances.UserManager.getCBEMembers({from: ctx.accounts[0]})
    .then(accounts => {

      ctx.factory.nonBCE.account = _.chain(ctx.accounts)
        .without(...accounts[0])
        .head()
        .value();

      return new Promise(res => {
        ctx.web3.eth.sendTransaction({
          from: ctx.factory.nonBCE.account,
          to: ctx.factory.nonBCE.account,
          value: ctx.web3.toWei(0.05, 'ether')
        }, (err, address) => {
          res(address);
        });
      })
    })
    .then(result => {
      expect(result).toBeDefined();
      return Promise.resolve();
    })
);

test('validate tx doesn\'t exist in mongo', () =>
  Promise.delay(20000)
    .then(() =>
      transactionModel
        .findOne({from: ctx.factory.nonBCE.account})
    )
    .then(result => {
      expect(result).toBeNull();
      return Promise.resolve();
    })
);