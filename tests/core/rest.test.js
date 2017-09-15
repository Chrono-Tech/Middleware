const config = require('../../config'),
  _ = require('lodash'),
  Promise = require('bluebird'),
  helpers = require('../helpers'),
  accountModel = require('../models/accountModel'),
  expect = require('chai').expect,
  mongoose = require('mongoose'),
  request = require('request'),
  moment = require('moment'),
  ctx = {
    factory: {}
  };

module.exports = (web3, smEvents) => {

  it('validate all event routes', () =>
    Promise.all(
      _.map(smEvents.eventModels, (model, name) =>
        new Promise((res, rej) => {
          request(`http://localhost:${config.rest.port}/events/${name}`, (err, resp) => {
            err || resp.statusCode !== 200 ? rej(err) : res()
          })
        })
      )
    )
  );

  it('add account (if not exist) to mongo', async () => {
    let accounts = await Promise.promisify(web3.eth.getAccounts)();
    try{
      await new accountModel({address: accounts[0]}).save();
    }catch (e){}
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

  it('validate query language', async () => {
    await Promise.delay(10000);

    let accounts = await Promise.promisify(web3.eth.getAccounts)();
    let data = await Promise.all(
      [
        `hash=${ctx.hash}`,
        `hash!=${ctx.hash}`,
        `to=${accounts[1]}`,
        `created>${moment().add(-30, 'minutes').toISOString()}`
      ].map((query) =>
        new Promise((res, rej) =>
          request(`http://localhost:${config.rest.port}/transactions?${query}`, (err, resp, body) => {
            err || resp.statusCode !== 200 ? rej(err) : res(JSON.parse(body))
          })
        )
      )
    );

    expect(data[0][0]).to.include({'hash': ctx.hash});
    expect(data[1][0]).to.not.include({'hash': ctx.hash});
    expect(data[2][0]).to.include({'to': accounts[1]});
    expect(data[3]).to.have.lengthOf.above(0);

  });
}