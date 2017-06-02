const config = require('../../config.json'),
  Web3 = require('web3'),
  web3 = new Web3(),
  contract = require("truffle-contract"),
  _ = require('lodash'),
  ipfsAPI = require('ipfs-api'),
  Promise = require('bluebird'),
  provider = new Web3.providers.HttpProvider(config.web3.url),
  helpers = require('../helpers'),
  chronoBankPlatformEmitter_definition = require("../../SmartContracts/build/contracts/ChronoBankPlatformEmitter"),
  chronoBankPlatform_definition = require("../../SmartContracts/build/contracts/ChronoBankPlatform"),
  chronoMintEmitter_definition = require("../../SmartContracts/build/contracts/ChronoMintEmitter"),
  chronoMint_definition = require("../../SmartContracts/build/contracts/ChronoMint"),
  eventsHistory_definition = require("../../SmartContracts/build/contracts/EventsHistory"),
  userManager_definition = require("../../SmartContracts/build/contracts/UserManager"),
  mongoose = require('mongoose'),
  emitters = {},
  contracts = {},
  factory = {};

beforeAll(() => {
  let fakeArgs = [0, 0, 0, 0, 0, 0, 0, 0];
  web3.setProvider(provider);
  let chronoBankPlatform = contract(chronoBankPlatform_definition);
  let chronoBankPlatformEmitter = contract(chronoBankPlatformEmitter_definition);
  let chronoMintEmitter = contract(chronoMintEmitter_definition);
  let eventsHistory = contract(eventsHistory_definition);
  let chronoMint = contract(chronoMint_definition);
  let userManager = contract(userManager_definition);

  [chronoBankPlatform, chronoBankPlatformEmitter, chronoMintEmitter, eventsHistory, chronoMint, userManager]
    .forEach(c => {
      c.defaults({from: web3.eth.coinbase, gas: 3000000});
      c.setProvider(provider);
    });

  return Promise.all([
    eventsHistory.deployed(),
    chronoMintEmitter.deployed(),
    chronoBankPlatformEmitter.deployed(),
    chronoBankPlatform.deployed(),
    chronoMint.deployed(),
    userManager.deployed()
  ])
    .spread((EventsHistory, ChronoMintEmitter, ChronoBankPlatformEmitter, ChronoBankPlatform, ChronoMint, UserManager) => {

      return Promise.all([
        ChronoMint,
        ChronoBankPlatform,
        ChronoBankPlatform.setupEventsHistory(EventsHistory.address, {gas: 3000000}),
        ChronoMint.setupEventsHistory(EventsHistory.address, {gas: 3000000}),
        UserManager.setupEventsHistory(EventsHistory.address, {gas: 3000000}),
        EventsHistory.addEmitter(ChronoMintEmitter.contract.newLOC.getData.apply(this, fakeArgs).slice(0, 10), ChronoMintEmitter.address, {gas: 3000000}),
        EventsHistory.addEmitter(ChronoMintEmitter.contract.hashUpdate.getData.apply(this, fakeArgs).slice(0, 10), ChronoMintEmitter.address, {gas: 3000000}),
        EventsHistory.addEmitter(ChronoMintEmitter.contract.cbeUpdate.getData.apply(this, fakeArgs).slice(0, 10), ChronoMintEmitter.address, {gas: 3000000}),
        EventsHistory.addEmitter(ChronoMintEmitter.contract.cbeUpdate.getData.apply(this, fakeArgs).slice(0, 10), ChronoMintEmitter.address, {gas: 3000000}),
        EventsHistory.addEmitter(ChronoBankPlatformEmitter.contract.emitTransfer.getData.apply(this, fakeArgs).slice(0, 10), ChronoBankPlatformEmitter.address, {gas: 3000000}),
        EventsHistory.addEmitter(ChronoBankPlatformEmitter.contract.emitIssue.getData.apply(this, fakeArgs).slice(0, 10), ChronoBankPlatformEmitter.address, {gas: 3000000}),
        EventsHistory.addEmitter(ChronoBankPlatformEmitter.contract.emitRevoke.getData.apply(this, fakeArgs).slice(0, 10), ChronoBankPlatformEmitter.address, {gas: 3000000}),
        EventsHistory.addEmitter(ChronoBankPlatformEmitter.contract.emitOwnershipChange.getData.apply(this, fakeArgs).slice(0, 10), ChronoBankPlatformEmitter.address, {gas: 3000000}),
        EventsHistory.addEmitter(ChronoBankPlatformEmitter.contract.emitApprove.getData.apply(this, fakeArgs).slice(0, 10), ChronoBankPlatformEmitter.address, {gas: 3000000}),
        EventsHistory.addEmitter(ChronoBankPlatformEmitter.contract.emitRecovery.getData.apply(this, fakeArgs).slice(0, 10), ChronoBankPlatformEmitter.address, {gas: 3000000}),
        EventsHistory.addEmitter(ChronoBankPlatformEmitter.contract.emitError.getData.apply(this, fakeArgs).slice(0, 10), ChronoBankPlatformEmitter.address, {gas: 3000000}),
        EventsHistory.addVersion(ChronoBankPlatform.address, "Origin", "Initial version."),
        EventsHistory.addVersion(ChronoMint.address, "Origin", "Initial version."),
        EventsHistory.addVersion(UserManager.address, "Origin", "Initial version."),
        chronoBankPlatformEmitter.at(EventsHistory.address),
        chronoMintEmitter.at(EventsHistory.address)
      ])
    })
    .then((data) => {
      contracts.mint = data[0];
      contracts.platform = data[1];
      emitters.mint = data[data.length - 1];
      emitters.platform = data[data.length - 2];
      return mongoose.connect(config.mongo.uri);
    })
});

test('add new loc', () => {

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
      factory.hash = {new: data[0].toJSON().multihash};
      return contracts.mint.addLOC(
        helpers.bytes32(helpers.generateRandomString()),
        helpers.bytes32("www.ru"),
        1000000,
        helpers.bytes32fromBase58(factory.hash.new),
        Math.round(+new Date() / 1000),
        helpers.bytes32('LHT')
      )
    })
    .then(result => {
      expect(result).toBeDefined();
      expect(result.tx).toBeDefined();
      return Promise.resolve();
    })
});

test('fetch changes for loc', () =>
  new Promise(res => {
    emitters.mint.allEvents({fromBlock: 0}).watch((err, result) => {
      if (result && result.event === 'NewLOC') {
        expect(result.args.locName).toBeDefined();
        contracts.mint.getLOCByName(result.args.locName)
          .then(data => {
            if (helpers.bytes32toBase58(data[4]) === factory.hash.new) {
              factory.hash.new_raw = data[4];
              factory.newLoc = {name: result.args.locName};
              res();
            }
          })
      }
    });
  })
);

test('validate hash on mongo', () =>
  Promise.delay(2000)
    .then(() =>
      mongoose.model('NewLOC', new mongoose.Schema({
          locName: {type: mongoose.Schema.Types.Mixed}
        }
      )).findOne({locName: factory.newLoc.name})
    )
    .then(result => {
      expect(result).toBeDefined();
      expect(result.locName).toBeDefined();
      return Promise.resolve();
    })
);

