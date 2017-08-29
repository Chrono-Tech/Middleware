const expect = require('chai').expect,
  config = require('../../config'),
  SockJS = require('sockjs-client'),
  Promise = require('bluebird'),
  transactionModel = require('../../models/transactionModel'),
  accountModel = require('../../models/accountModel'),
  helpers = require('../helpers'),
  amqp = require('amqplib'),
  Stomp = require('webstomp-client'),
  ctx = {};

module.exports = (web3, contracts, smEvents) => {

  it('add account to mongo', async () => {
    let accounts = await Promise.promisify(web3.eth.getAccounts)();
    try {
      await new accountModel({address: accounts[0]}).save();
    } catch (e) {
    }
  });

  it('send some eth from 0 account to account 1', async () => {
    let accounts = await Promise.promisify(web3.eth.getAccounts)();
    ctx.hash = await Promise.promisify(web3.eth.sendTransaction)({
      from: accounts[0],
      to: accounts[1],
      value: 100
    });

    expect(ctx.hash).to.be.string;
  });

  it('validate tx in mongo', async () => {
    await Promise.delay(10000);
    let result = await transactionModel.findOne({hash: ctx.hash});
    expect(result).to.include({hash: ctx.hash});
  });

  it('add TIME Asset', async () => {

    let accounts = await Promise.promisify(web3.eth.getAccounts)();
    let result = await contracts.AssetsManagerInstance.addAsset(
      contracts.ChronoBankAssetProxyInstance.address, 'TIME', accounts[0], {
        from: accounts[0],
        gas: 3000000
      });

    expect(result).to.have.own.property('tx');

  });

  it('send 100 TIME to owner1 from owner', async () => {

    let accounts = await Promise.promisify(web3.eth.getAccounts)();
    let result = await contracts.AssetsManagerInstance.sendAsset(
      helpers.bytes32('TIME'), accounts[1], 100, {
        from: accounts[0],
        gas: 3000000
      });

    expect(result).to.have.own.property('tx');

  });

  it('validate tx in mongo', async () => {
    await Promise.delay(10000);
    let accounts = await Promise.promisify(web3.eth.getAccounts)();

    let result = await smEvents.eventModels.Transfer.findOne({
      symbol: helpers.bytes32('TIME'),
      to: accounts[1]
    });

    expect(result).to.have.property('to');
  });

  it('send some eth again and validate notification via amqp', async () => {

    let accounts = await Promise.promisify(web3.eth.getAccounts)();
    ctx.hash = await Promise.promisify(web3.eth.sendTransaction)({
      from: accounts[0],
      to: accounts[1],
      value: 100
    });

    expect(ctx.hash).to.be.string;

    await Promise.all([
      (async () => {

        let amqpInstance = await amqp.connect(config.rabbit.url);
        let channel = await amqpInstance.createChannel();
        try {
          await channel.assertExchange('events', 'topic', {durable: false});
          await channel.assertQueue('app_eth_test.transaction');
          await channel.bindQueue('app_eth_test.transaction', 'events', 'eth_transaction.*');
        } catch (e) {
          channel = await amqpInstance.createChannel();
        }

        return await new Promise(res =>
          channel.consume('app_eth_test.transaction', res, {noAck: true})
        )

      })(),
      (async () => {
        let ws = new SockJS('http://localhost:15674/stomp');
        let client = Stomp.over(ws, {heartbeat: false, debug: false});
        return await new Promise(res =>
          client.connect('guest', 'guest', () => {
            client.subscribe('/exchange/events/eth_transaction.*', res)
          })
        );
      })()
    ]);
  });

};