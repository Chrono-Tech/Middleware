const config = require('../../config'),
  Web3 = require('web3'),
  web3 = new Web3(),
  _ = require('lodash'),
  Promise = require('bluebird'),
  helpers = require('../helpers'),
  ipfsAPI = require('ipfs-api'),
  contractsCtrl = require('../../controllers').contractsCtrl,
  eventsCtrl = require('../../controllers').eventsCtrl,
  mongoose = require('mongoose'),
  request = require('request'),
  moment = require('moment'),
  contracts = {},
  events = {},
  factory = {},
  contracts_instances = {};

jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;

beforeAll(() => {
  let provider = new Web3.providers.HttpProvider(`http://${config.web3.networks.development.host}:${config.web3.networks.development.port}`);
  web3.setProvider(provider);

  return contractsCtrl(config.web3.networks.development)
    .then((data) => {
      _.merge(contracts_instances, data.instances);
      _.merge(contracts, data.contracts);
      _.merge(events, eventsCtrl(data.instances, data.web3));
      return mongoose.connect(config.mongo.uri);
    })
});

afterAll(() =>
  mongoose.disconnect()
);

test('validate all routes', () =>
  Promise.all(
    _.map(events.eventModels, (model, name) =>
      new Promise((res, rej) =>
        request(`http://localhost:${config.rest.port}/events/${name}`, (err, resp) => {
          err || resp.statusCode !== 200 ? rej(err) : res()
        })
      )
    )
  )
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
        currency: helpers.bytes32('LHT'),
        created: new Date()
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
      expect(result.logs[0].args.locName).toBeDefined();
      factory.Loc.encoded_name = result.logs[0].args.locName;
      return Promise.resolve();
    })
});

test('fetch changes for loc via getLoc', () =>
  Promise.delay(2000)
    .then(() =>
      new Promise(res => {
        contracts.LOCManager.at(contracts_instances.MultiEventsHistory.address)
          .allEvents({fromBlock: 0}).watch((err, result) => {
          if (result && result.event === 'NewLOC') {
            expect(result.args.locName).toBeDefined();
            contracts_instances.LOCManager.getLOCByName(result.args.locName)
              .then(data => {
                if (data[4] !== factory.Loc.hash) {
                  return;
                }
                new Promise((res, rej) =>
                  request(`http://localhost:${config.rest.port}/events/NewLOC`, (err, resp, body) => {
                    err || resp.statusCode !== 200 ? rej(err) : res(JSON.parse(body))
                  })
                )
                  .then(response => {
                    let item = _.find(response, {locName: data[0]});
                    expect(item).toBeDefined();
                    res();
                  })
              })
          }
        });
      })
    )
);

test('validate query language', () =>
  Promise.all(
    [
      `locName=${factory.Loc.encoded_name}`,
      `locName!=${factory.Loc.encoded_name}`,
      `network=development`,
      `created<${moment(factory.Loc.created).add(-5,  'minutes').format()}`
    ].map((query) =>
      new Promise((res, rej) =>
        request(`http://localhost:${config.rest.port}/events/NewLOC?${query}`, (err, resp, body) => {
          err || resp.statusCode !== 200 ? rej(err) : res(JSON.parse(body))
        })
      )
    )
  )
    .spread((locName, noLocName, network, created) => {

      let noItem = _.find(noLocName, {locName: factory.Loc.encoded_name});
      let networkItem = _.find(network, {locName: factory.Loc.encoded_name});
      let createdItem = _.find(created, {locName: factory.Loc.encoded_name});


      expect(locName[0].locName).toEqual(factory.Loc.encoded_name);
      expect(noItem).toBeUndefined();
      expect(networkItem).toBeDefined();
      expect(createdItem).toBeUndefined();


    })
)