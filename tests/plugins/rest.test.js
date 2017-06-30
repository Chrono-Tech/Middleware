const config = require('../../config'),
  _ = require('lodash'),
  Promise = require('bluebird'),
  helpers = require('../helpers'),
  ipfsAPI = require('ipfs-api'),
  contractsCtrl = require('../../controllers').contractsCtrl,
  eventsCtrl = require('../../controllers').eventsCtrl,
  mongoose = require('mongoose'),
  request = require('request'),
  blockModel = require('../../models').blockModel,
  moment = require('moment'),
  ctx = {
    events: {},
    contracts_instances: {},
    factory: {},
    contracts: {},
    web3: null
  };

jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;

beforeAll(() => {
  return contractsCtrl('development')
    .then((data) => {
      ctx.contracts_instances = data.instances;
      ctx.contracts = data.contracts;
      ctx.events = eventsCtrl(data.instances, data.web3);
      ctx.web3 = data.web3;
      return mongoose.connect(config.mongo.uri);
    })
    .then(() => helpers.awaitLastBlock(ctx))
});

afterAll(() => {
  ctx.web3.currentProvider.connection.end();
  return mongoose.disconnect();
});

test('validate all routes', () =>
  Promise.all(
    _.map(ctx.events.eventModels, (model, name) =>
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
      ctx.factory.Loc = {
        name: helpers.bytes32(helpers.generateRandomString()),
        website: helpers.bytes32("www.ru"),
        issueLimit: 1000000,
        hash: helpers.bytes32fromBase58(data[0].toJSON().multihash),
        expDate: Math.round(+new Date() / 1000),
        currency: helpers.bytes32('LHT'),
        created: new Date()
      };

      return new Promise(res =>
        ctx.web3.eth.getCoinbase((err, result) => res(result))
      );
    })
    .then(coinbase =>
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
      expect(result.logs[0].args.locName).toBeDefined();
      ctx.factory.Loc.encoded_name = result.logs[0].args.locName;
      return Promise.resolve();
    })
});

test('validate query language', () =>
  Promise.delay(10000)
    .then(() =>
      Promise.all(
        [
          `locName=${ctx.factory.Loc.encoded_name}`,
          `locName!=${ctx.factory.Loc.encoded_name}`,
          `network=development`,
          `created<${moment(ctx.factory.Loc.created).add(-5, 'minutes').toISOString()}`
        ].map((query) =>
          new Promise((res, rej) =>
            request(`http://localhost:${config.rest.port}/events/NewLOC?${query}`, (err, resp, body) => {
              err || resp.statusCode !== 200 ? rej(err) : res(JSON.parse(body))
            })
          )
        )
      )
    )

    .spread((locName, noLocName, network, created) => {

      let noItem = _.find(noLocName, {locName: ctx.factory.Loc.encoded_name});
      let networkItem = _.find(network, {locName: ctx.factory.Loc.encoded_name});
      let createdItem = _.find(created, {locName: ctx.factory.Loc.encoded_name});

      expect(locName[0].locName).toEqual(ctx.factory.Loc.encoded_name);
      expect(noItem).toBeUndefined();
      expect(networkItem).toBeDefined();
      expect(createdItem).toBeUndefined();

    })
);