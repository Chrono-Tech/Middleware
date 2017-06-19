const config = require('../../config'),
  Web3 = require('web3'),
  web3 = new Web3(),
  contract = require("truffle-contract"),
  _ = require('lodash'),
  ipfsAPI = require('ipfs-api'),
  Promise = require('bluebird'),
  helpers = require('../helpers'),
  contractsCtrl = require('../../controllers').contractsCtrl,
  chronoBankPlatform_definition = require("../../SmartContracts/build/contracts/ChronoBankPlatform"),
  chronomint_definition = require("../../SmartContracts/build/contracts/LOCManager"),
  mongoose = require('mongoose'),
  contracts = {},
  contracts_instances = {},
  factory = {};

jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;

beforeAll(() => {
  let provider = new Web3.providers.HttpProvider(`http://${config.web3.networks.development.host}:${config.web3.networks.development.port}`);
  web3.setProvider(provider);
  let chronoBankPlatform = contract(chronoBankPlatform_definition);
  let chronoMint = contract(chronomint_definition);

  [chronoBankPlatform, chronoMint]
    .forEach(c => {
      c.defaults({from: web3.eth.coinbase, gas: 3000000});
      c.setProvider(provider);
    });

  return contractsCtrl(config.web3.networks.development)
    .then((data) => {
      _.merge(contracts_instances, data.instances);
      _.merge(contracts, data.contracts);
      return chronoMint.at(contracts_instances.MultiEventsHistory.address)
    })
    .then((mint) => {
      contracts.mint = mint;
      return mongoose.connect(config.mongo.uri);
    })
});

afterAll(() =>
  mongoose.disconnect()
);

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
      factory.Loc = {
        name: helpers.bytes32(helpers.generateRandomString()),
        website: helpers.bytes32("www.ru"),
        issueLimit: 1000000,
        hash: helpers.bytes32fromBase58(data[0].toJSON().multihash),
        expDate: Math.round(+new Date() / 1000),
        currency: helpers.bytes32('LHT')
      };
      
      return contracts_instances.LOCManager.addLOC(
        factory.Loc.name,
        factory.Loc.website,
        factory.Loc.issueLimit,
        factory.Loc.hash,
        factory.Loc.expDate,
        factory.Loc.currency,
        {from: web3.eth.coinbase}
      )
    })
    .then(result => {
      expect(result).toBeDefined();
      expect(result.tx).toBeDefined();
      return Promise.resolve();
    })
});

test('fetch changes for loc via getLoc', () =>
  new Promise(res => {
    contracts.LOCManager.at(contracts_instances.MultiEventsHistory.address)
      .allEvents({fromBlock: 0}).watch((err, result) => {
      if (result && result.event === 'NewLOC') {
        expect(result.args.locName).toBeDefined();
        contracts_instances.LOCManager.getLOCByName(result.args.locName)
          .then(data => {
            if (data[4] === factory.Loc.hash) {
              res();
            }
          })
      }
    });
  })
);

test('validate hash in mongo', () =>
  Promise.delay(2000)
    .then(() =>
      mongoose.model('NewLOC', new mongoose.Schema({
          locName: {type: mongoose.Schema.Types.Mixed}
        }
      )).findOne({locName: factory.Loc.name})
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
      factory.Loc.old_hash = factory.Loc.hash;
      factory.Loc.hash = helpers.bytes32fromBase58(data[0].toJSON().multihash);
      return contracts_instances.LOCManager.setLOC(
        factory.Loc.name,
        factory.Loc.name,
        factory.Loc.website,
        factory.Loc.issueLimit,
        factory.Loc.hash,
        factory.Loc.expDate,
        {from: web3.eth.coinbase}
      )
    })
    .then(result => {
      expect(result).toBeDefined();
      expect(result.tx).toBeDefined();
      return Promise.resolve();
    })
});

test('fetch changes for loc via HashUpdate event', () =>
  new Promise(res => {
    contracts.LOCManager.at(contracts_instances.MultiEventsHistory.address)
      .allEvents({fromBlock: 0}).watch((err, result) => {
      if (result && result.event === 'HashUpdate' && result.args.newHash === factory.Loc.hash) {
        res();
      }
    });
  })
);

test('validate new hash in mongo', () =>
  Promise.delay(2000)
    .then(() =>
      mongoose.model('hashupdates', new mongoose.Schema({
          oldHash: {type: mongoose.Schema.Types.Mixed},
          newHash: {type: mongoose.Schema.Types.Mixed}
        }
      )).findOne({oldHash: factory.Loc.old_hash, newHash: factory.Loc.hash})
    )
    .then(result => {
      expect(result).toBeDefined();
      return Promise.resolve();
    })
);


