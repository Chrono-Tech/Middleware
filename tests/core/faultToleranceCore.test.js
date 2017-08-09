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

beforeAll(async() => {
  let data = await contractsCtrl('development');
  ctx.contracts_instances = data.instances;
  ctx.contracts = data.contracts;
  ctx.web3 = data.web3;
  ctx.eventModels = eventsCtrl(data.instances, data.web3).eventModels;

  ctx.accounts = await new Promise(res => {
    ctx.web3.eth.getAccounts((err, result) => res(result));
  });

  mongoose.connect(config.mongo.uri);
  return await helpers.awaitLastBlock(ctx);
});

afterAll(() => {
  ctx.web3.currentProvider.connection.end();
  return mongoose.disconnect();
});

test('validate block exist in mongo', async() => {
  let result = await blockModel
    .findOne({network: 'development'});
  expect(result).toBeDefined();
  expect(result.block).toBeDefined();
  ctx.factory.block = result.block;
});

test('validate block exist in mongo', async() => {
  let result = await blockModel
    .findOne({network: 'development'});

  expect(result).toBeDefined();
  expect(result.block).toBeDefined();
  ctx.factory.block = result.block;
});

test('add new CBE', async() => {

  const obj = {
    Data: new Buffer(helpers.generateRandomString()),
    Links: []
  };
  const ipfs_stack = config.nodes.map(node => ipfsAPI(node));

  let data = await Promise.all(
    _.chain(ipfs_stack)
      .map(ipfs =>
        ipfs.object.put(obj)
      )
      .value()
  );

  ctx.factory.BCE = {
    hash: helpers.bytes32fromBase58(data[0].toJSON().multihash)
  };

  let accounts = await ctx.contracts_instances.UserManager.getCBEMembers({from: ctx.accounts[0]});
  ctx.factory.BCE.account = _.chain(ctx.accounts)
    .without(...accounts[0])
    .head()
    .value();

  expect(ctx.factory.BCE.account).toBeDefined();
  let result = await ctx.contracts_instances.UserManager.addCBE(
    ctx.factory.BCE.account,
    ctx.factory.BCE.hash,
    {from: ctx.accounts[0]}
  );

  expect(result).toBeDefined();
  expect(result.tx).toBeDefined();

});

test('validate hash and count of records in mongo', async() => {
  await Promise.delay(30000);
  let result = await ctx.eventModels.SetHash.find({});
  let item = _.find(result, {newHash: ctx.factory.BCE.hash});
  ctx.count = result.length;
  expect(item).toBeDefined();
  expect(item.newHash).toBeDefined();

});

test('reset block to 0', async() => {
  let result = await blockModel
    .update({network: 'development'}, {$set: {block: 0}});

  expect(result).toBeDefined();
});

test('validate hash and count of records in mongo after resetting block', async() => {
  await Promise.delay(60000);
  let result = await ctx.eventModels.SetHash.find({});
  expect(result.length).toBe(ctx.count);

});

test('add new CBE - again', async() => {

  const obj = {
    Data: new Buffer(helpers.generateRandomString()),
    Links: []
  };
  const ipfs_stack = config.nodes.map(node => ipfsAPI(node));

  let data = await Promise.all(
    _.chain(ipfs_stack)
      .map(ipfs =>
        ipfs.object.put(obj)
      )
      .value()
  );

  ctx.factory.BCE = {
    hash: helpers.bytes32fromBase58(data[0].toJSON().multihash)
  };

  let accounts = await ctx.contracts_instances.UserManager.getCBEMembers({from: ctx.accounts[0]});

  ctx.factory.BCE.account = _.chain(ctx.accounts)
    .without(...accounts[0])
    .head()
    .value();

  expect(ctx.factory.BCE.account).toBeDefined();

  let result = await ctx.contracts_instances.UserManager.addCBE(
    ctx.factory.BCE.account,
    ctx.factory.BCE.hash,
    {from: ctx.accounts[0]}
  );

  expect(result).toBeDefined();
  expect(result.tx).toBeDefined();

});

test('validate block became actual', async() => {
  await Promise.delay(60000);
  let result = await blockModel.findOne({network: 'development'});
  expect(result.block).toBeGreaterThan(ctx.factory.block);
});