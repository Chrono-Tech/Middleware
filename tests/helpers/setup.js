const Web3 = require('web3'),
  web3 = new Web3(),
  contract = require('truffle-contract'),
  config = require('../../config.json'),
  provider = new Web3.providers.HttpProvider(config.web3.url),
  path = require('path'),
  _ = require('lodash'),
  Promise = require('bluebird');

web3.setProvider(provider);

const contracts = require('require-all')({
  dirname: path.join(__dirname, '../../SmartContracts/build/contracts'),
  filter: /(^((ChronoBankPlatformEmitter)|(?!(Emitter|Interface)).)*)\.json$/,
  resolve: Contract => {
    let c = contract(Contract);
    c.defaults({from: web3.eth.coinbase, gas: 3000000});
    c.setProvider(provider);
    return c;
  }
});

const TIME_SYMBOL = 'TIME';
const TIME_NAME = 'Time Token';

const LHT_SYMBOL = 'LHT';
const LHT_NAME = 'Labour-hour Token';

const fakeArgs = [0, 0, 0, 0, 0, 0, 0, 0];

let accounts;
let instances = {};

let setup = function(callback) {

  Promise.all(
    _.map(contracts, c =>
      c.deployed()
        .then(instance => {
          return _.set(instances, c.toJSON().contract_name, instance)
        }).catch(err => {
      })
    )
  )
    .then(() => {
      console.log('link addresses');
      Promise.all([
        instances.ContractsManager.init(),
        instances.UserManager.init(contracts.ContractsManager.address),
        instances.PendingManager.init(contracts.ContractsManager.address),
        instances.LOCManager.init(contracts.ContractsManager.address)
      ])
    }).then(() =>
    Promise.all([
      instances.ERC20Manager.init(contracts.ContractsManager.address),
      instances.ExchangeManager.init(contracts.ContractsManager.address),
      instances.Rewards.init(contracts.ContractsManager.address, 0),
      instances.Vote.init(contracts.ContractsManager.address),
      instances.TimeHolder.init(contracts.ContractsManager.address, contracts.ChronoBankAssetProxy.address),
      instances.ChronoBankAsset.init(contracts.ChronoBankAssetProxy.address, {from: web3.eth.coinbase}),
      instances.ChronoBankAssetWithFee.init(contracts.ChronoBankAssetWithFeeProxy.address, {from: web3.eth.coinbase}),
      instances.ChronoBankAssetProxy.init(contracts.ChronoBankPlatform.address, TIME_SYMBOL, TIME_NAME, {from: web3.eth.coinbase}),
      instances.ChronoBankAssetWithFeeProxy.init(contracts.ChronoBankPlatform.address, LHT_SYMBOL, LHT_NAME, {from: web3.eth.coinbase}),
      instances.TimeHolder.addListener(instances.Rewards.address),
      instances.TimeHolder.addListener(instances.Vote.address),
      instances.UserManager.setupEventsHistory(instances.MultiEventsHistory.address),
      instances.MultiEventsHistory.authorize(instances.UserManager.address),
      instances.PendingManager.setupEventsHistory(instances.MultiEventsHistory.address),
      instances.MultiEventsHistory.authorize(instances.ChronoBankAsset.address),
      instances.LOCManager.setupEventsHistory(instances.MultiEventsHistory.address),
      instances.MultiEventsHistory.authorize(instances.PendingManager.address),
      instances.ERC20Manager.setupEventsHistory(instances.MultiEventsHistory.address),
      instances.MultiEventsHistory.authorize(instances.ERC20Manager.address),
      instances.AssetsManager.setupEventsHistory(instances.MultiEventsHistory.address),
      instances.MultiEventsHistory.authorize(instances.AssetsManager.address),
      instances.ExchangeManager.setupEventsHistory(instances.MultiEventsHistory.address),
      instances.MultiEventsHistory.authorize(instances.ExchangeManager.address),
      instances.Rewards.setupEventsHistory(instances.MultiEventsHistory.address),
      instances.MultiEventsHistory.authorize(instances.Rewards.address),
      instances.Vote.setupEventsHistory(instances.MultiEventsHistory.address),
      instances.MultiEventsHistory.authorize(instances.Vote.address)
    ])
  )
    .then(() => {

      return Promise.all(
        _.chain(instances.ChronoBankPlatformEmitter.abi)
          .filter({type: 'event'})
          .map(ev => {
            return instances.EventsHistory.addEmitter(instances.ChronoBankPlatformEmitter.contract[ev.name].getData.apply(this, fakeArgs).slice(0, 10),
              instances.ChronoBankPlatformEmitter.address,
              {from: web3.eth.coinbase, gas: 3000000}
            )
          })
          .union([
            instances.ChronoBankPlatform.setupEventsHistory(
              contracts.EventsHistory.address,
              {from: web3.eth.coinbase, gas: 3000000}),
            instances.EventsHistory.addVersion(instances.ChronoBankPlatform.address, 'Origin', 'Initial version.')
          ])
          .value()
      )
    })
    .then(() => {
      callback();
    })
    .catch(e => {
      console.log(e);
    });
};

module.exports.setup = setup;
module.exports.contracts = instances;
