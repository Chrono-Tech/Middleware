const config = require('../../config'),
  _ = require('lodash'),
  Promise = require('bluebird'),
  helpers = require('../helpers'),
  ipfsAPI = require('ipfs-api'),
  mongoose = require('mongoose'),
  request = require('request'),
  moment = require('moment'),
  ctx = {
    events: {},
    contracts_instances: {},
    factory: {},
    contracts: {},
    web3: null
  };

module.exports = (web3, contracts, smEvents) => {

  test('validate all routes', () =>
    Promise.all(
      _.map(ctx.events.eventModels, (model, name) =>
        new Promise((res, rej) => {
          request(`http://localhost:${config.rest.port}/events/${name}`, (err, resp) => {
            err || resp.statusCode !== 200 ? rej(err) : res()
          })
        })
      )
    )
  );

  test('add new loc', async () => {

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

    ctx.factory.Loc = {
      name: helpers.bytes32(helpers.generateRandomString()),
      website: helpers.bytes32("www.ru"),
      issueLimit: 1000000,
      hash: helpers.bytes32fromBase58(data[0].toJSON().multihash),
      expDate: Math.round(+new Date() / 1000),
      currency: helpers.bytes32('LHT'),
      created: new Date()
    };

    let coinbase = await new Promise(res =>
      ctx.web3.eth.getCoinbase((err, result) => res(result))
    );

    let result = await ctx.contracts_instances.LOCManager.addLOC(
      ctx.factory.Loc.name,
      ctx.factory.Loc.website,
      ctx.factory.Loc.issueLimit,
      ctx.factory.Loc.hash,
      ctx.factory.Loc.expDate,
      ctx.factory.Loc.currency,
      {from: coinbase}
    );

    expect(result).toBeDefined();
    expect(result.tx).toBeDefined();
    expect(result.logs[0].args.locName).toBeDefined();
    ctx.factory.Loc.encoded_name = result.logs[0].args.locName;

  });

  test('validate query language', async () => {
    await Promise.delay(10000);

    let data = await Promise.all(
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
    );

    let noItem = _.find(data[1], {locName: ctx.factory.Loc.encoded_name});
    let networkItem = _.find(data[2], {locName: ctx.factory.Loc.encoded_name});
    let createdItem = _.find(data[3], {locName: ctx.factory.Loc.encoded_name});

    expect(data[0][0].locName).toEqual(ctx.factory.Loc.encoded_name);
    expect(noItem).toBeUndefined();
    expect(networkItem).toBeDefined();
    expect(createdItem).toBeUndefined();

  });
}