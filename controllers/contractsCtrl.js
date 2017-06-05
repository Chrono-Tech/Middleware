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

/**
 * @module contracts Controller
 * @description initialize all events for smartContracts,
 * and prepare collections in mongo for them
 * @returns {{eventModels, initEmitter, contracts: (Function|*)}}
 */

module.exports = () => {

  const provider = new Web3.providers.HttpProvider(config.web3.url);

  web3.setProvider(provider);

  let ChronoBankPlatform = contract(contracts.ChronoBankPlatform);
  let ChronoBankPlatformEmitter = contract(contracts.ChronoBankPlatformEmitter);
  let ChronoMintEmitter = contract(contracts.ChronoMintEmitter);
  let EventsHistory = contract(contracts.EventsHistory);
  let ChronoMint = contract(contracts.ChronoMint);
  let UserManager = contract(contracts.UserManager);

  [ChronoBankPlatform, ChronoBankPlatformEmitter, ChronoMintEmitter, EventsHistory, ChronoMint, UserManager]
    .forEach(c => {
      c.defaults({from: web3.eth.coinbase, gas: 3000000});
      c.setProvider(provider);
    });

  let eventModels = _.chain([ChronoBankPlatformEmitter, ChronoMintEmitter])
    .map(emitter =>
      _.chain(emitter).get('abi')
        .filter({type: 'event'})
        .value()
    )
    .flatten()
    .uniqBy('name')
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
    ChronoMintEmitter.deployed(),
    ChronoBankPlatform.deployed(),
    ChronoMint.deployed(),
    UserManager.deployed()
  ])
    .spread((eventsHistory, chronoMintEmitter, chronoBankPlatform, chronoMint, userManager) =>
      Promise.all([
        chronoBankPlatform.setupEventsHistory(eventsHistory.address, {gas: 3000000}),
        chronoMint.setupEventsHistory(eventsHistory.address, {gas: 3000000}),
        userManager.setupEventsHistory(eventsHistory.address, {gas: 3000000}),
        ChronoBankPlatformEmitter.at(eventsHistory.address),
        ChronoMintEmitter.at(eventsHistory.address)
      ])
    ).then(data => {
      return {
        mint: data[data.length - 1],
        platform: data[data.length - 2]
      }
    });

  let initContracts = Promise.all([
    ChronoBankPlatform.deployed(),
    ChronoMint.deployed()
  ])
    .spread((platform, mint) =>
      Promise.resolve({platform, mint})
    );

  return {
    eventModels: eventModels,
    initEmitter: initEmitter,
    contracts: initContracts
  }

};