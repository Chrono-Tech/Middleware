const _ = require('lodash'),
  Web3 = require('web3'),
  web3 = new Web3(),
  config = require('../config.json'),
  require_all = require('require-all'),
  path = require('path'),
  contract = require("truffle-contract"),
  mongoose = require('mongoose'),
  Promise = require('bluebird'),
  contracts = require_all({
    dirname: path.join(__dirname, '..', 'SmartContracts', 'build', 'contracts'),
    filter: /(.+)\.json$/,
  });

module.exports = () => {

  const provider = new Web3.providers.HttpProvider(config.web3.url);

  web3.setProvider(provider);

  let chronoBankPlatform = contract(contracts.ChronoBankPlatform);
  let ChronoBankPlatformEmitter = contract(contracts.ChronoBankPlatformEmitter);
  let chronoMintEmitter = contract(contracts.ChronoMintEmitter);
  let EventsHistory = contract(contracts.EventsHistory);
  let chronoMint = contract(contracts.ChronoMint);
  let userManager = contract(contracts.UserManager);

  [chronoBankPlatform, ChronoBankPlatformEmitter, chronoMintEmitter, EventsHistory, chronoMint, userManager]
    .forEach(c => {
      c.defaults({from: web3.eth.coinbase, gas: 3000000});
      c.setProvider(provider);
    });

  let eventModels = _.chain(ChronoBankPlatformEmitter)
    .get('abi')
    .filter({type: 'event'})
    .transform((result, ev) => {
      result[ev.name] = mongoose.model(ev.name, new mongoose.Schema(
        _.chain(ev.inputs).transform((result, obj) => {
          result[obj.name] = {type: mongoose.Schema.Types.Mixed}
        }, {}).merge({
          created: {type: Date, required: true, default: Date.now}
        }).value()
      ));
    }, {})
    .value();

  let initEmitter = Promise.all([
    EventsHistory.deployed(),
    chronoMintEmitter.deployed(),
    chronoBankPlatform.deployed(),
    chronoMint.deployed(),
    userManager.deployed()
  ])
    .spread((EventsHistory, chronoMintEmitter, chronoBankPlatform, chronoMint, userManager) =>
      Promise.all([
        chronoBankPlatform.setupEventsHistory(EventsHistory.address, {gas: 3000000}),
        chronoMint.setupEventsHistory(EventsHistory.address, {gas: 3000000}),
        userManager.setupEventsHistory(EventsHistory.address, {gas: 3000000}),
        ChronoBankPlatformEmitter.at(EventsHistory.address)
      ])
    ).then(data => _.last(data));

  return {
    eventModels: eventModels,
    initEmitter: initEmitter
  }

};