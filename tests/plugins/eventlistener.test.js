const config = require('../../config'),
  _ = require('lodash'),
  Promise = require('bluebird'),
  helpers = require('../helpers'),
  amqp = require('amqplib'),
  contractsCtrl = require('../../controllers').contractsCtrl,
  eventsCtrl = require('../../controllers').eventsCtrl,
  http = require('http'),
  mongoose = require('mongoose'),
  request = require('request'),
  moment = require('moment'),
  SockJS = require('sockjs-client'),
  Stomp = require('webstomp-client'),
  ctx = {
    amqp: {},
    stomp: {},
    events: {},
    contracts_instances: {},
    factory: {},
    contracts: {},
    web3: null
  };

jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;

beforeAll(async() => {
  let data = await contractsCtrl('development');
  ctx.amqp.connection = await amqp.connect(config.rabbit.url);
  ctx.amqp.channel = await ctx.amqp.connection.createChannel();
  ctx.stomp.ws = new SockJS('http://localhost:15674/stomp');
  ctx.stomp.client = Stomp.over(ctx.stomp.ws, {heartbeat: false, debug: false});
  await new Promise(res =>
    ctx.stomp.client.connect('guest', 'guest', res)
  );
  ctx.contracts_instances = data.instances;
  ctx.contracts = data.contracts;
  ctx.events = eventsCtrl(data.instances);
  ctx.web3 = data.web3;

  ctx.accounts = await new Promise(res => {
    ctx.web3.eth.getAccounts((err, result) => res(result));
  });

  mongoose.connect(config.mongo.uri);
  return await helpers.awaitLastBlock(ctx);
});

afterAll(() => {
  ctx.web3.currentProvider.connection.end();
  ctx.amqp.connection.close();
  ctx.stomp.client.disconnect();
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
  return Promise.resolve();

});

test('validate callback on transfer event via amqp', async() => {

  let clients = _.chain(new Array(_.random(2, 10))).map((i, s) => s + Date.now()).value();


  try {
    await ctx.amqp.channel.assertExchange('events', 'direct', {durable: false});
  }catch(e){
    ctx.amqp.channel = await ctx.amqp.connection.createChannel();
  }


  await Promise.all(
    _.map(clients, client => {
      return ctx.amqp.channel.assertQueue(`test.${client}`, {exclusive: true, autoDelete: true})
    })
  );

  await Promise.all(
    _.map(clients, client => {
      return ctx.amqp.channel.bindQueue(`test.${client}`, 'events', 'transfer')
    })
  );

  return await Promise.all(
    _.chain(clients)
      .map(client =>
        new Promise(res =>
          ctx.amqp.channel.consume(`test.${client}`, res, {noAck: true})
        )
      )
      .union([
        Promise.delay(5000)
          .then(() =>
            ctx.contracts_instances.AssetsManager.sendAsset(
              helpers.bytes32('TIME'), ctx.accounts[1], 100, {
                from: ctx.accounts[0],
                gas: 3000000
              })
          )
      ])
      .value()
  );
});

test('validate callback on transfer event via stomp client', async() => {


  let clients = _.chain(new Array(_.random(2, 10))).map((i, s) => s + Date.now()).value();

  return await Promise.all(
    _.chain(clients)
      .map(() => {
        return new Promise(res =>
          ctx.stomp.client.subscribe('/exchange/events/transfer', res, {noAck: true})
        )
      })
      .union([
        Promise.delay(5000)
          .then(() =>
            ctx.contracts_instances.AssetsManager.sendAsset(
              helpers.bytes32('TIME'), ctx.accounts[1], 100, {
                from: ctx.accounts[0],
                gas: 3000000
              })
          )
      ])
      .value()
  )
});