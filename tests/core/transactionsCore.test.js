const config = require('../../config'),
  Promise = require('bluebird'),
  helpers = require('../helpers'),
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

test('add TIME Asset', async() => {
  let result = await ctx.contracts_instances.AssetsManager.addAsset(
    ctx.contracts_instances.ChronoBankAssetProxy.address, 'TIME', ctx.accounts[0], {
      from: ctx.accounts[0],
      gas: 3000000
    });

  expect(result).toBeDefined();
  expect(result.tx).toBeDefined();

});

/*
 test('add LHT Asset', () => {
 return ctx.contracts_instances.AssetsManager.addAsset(
 ctx.contracts_instances.ChronoBankAssetProxy.address,
 helpers.bytes32('LHT'),
 ctx.contracts_instances.LOCManager.address, {
 from: ctx.accounts[0],
 gas: 3000000
 })
 .then(result => {
 expect(result).toBeDefined();
 expect(result.tx).toBeDefined();
 return Promise.resolve();
 });
 });
 */

test('send 100 TIME to owner1 from owner', async() => {
  let result = await ctx.contracts_instances.AssetsManager.sendAsset(
    helpers.bytes32('TIME'), ctx.accounts[1], 100, {
      from: ctx.accounts[0],
      gas: 3000000
    });

  expect(result).toBeDefined();
  expect(result.tx).toBeDefined();
});

test('validate tx in mongo', async() => {
  await Promise.delay(20000);

  let result = await ctx.eventModels.Transfer
    .findOne({symbol: helpers.bytes32('TIME'), to: ctx.accounts[1]});

  expect(result).toBeDefined();
  expect(result.to).toBeDefined();

});
