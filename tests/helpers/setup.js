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
/*
let storage;
let assetsManager;
let chronoBankPlatform;
let chronoMint;
let contractsManager;
let timeHolder;
let shareable;
let eventsHistory;
let erc20Manager;
let chronoBankPlatformEmitter;
let rewards;
let userManager;
let exchangeManager;
let chronoBankAsset;
let chronoBankAssetProxy;
let chronoBankAssetWithFee;
let chronoBankAssetWithFeeProxy;
let vote;
let multiEventsHistory;*/

let accounts;
let instances = {};

let setup = function(callback) {

  return new Promise(function(resolve, reject) {
    web3.eth.getAccounts((err, acc) => {
      console.log(acc);
      resolve(acc);
    });
  })
    .then(r => {
      accounts = r;
      console.log('--done');
    }).then(() =>
    Promise.all(
      _.map(contracts, c=>
      c.deployed()
        .then(instance=>{
          return _.set(instances, c.toJSON().contract_name, instance)
        }).catch(err=>{})
      )
    ).then(()=>{
    console.log(Object.keys(instances))
    })
/*      Promise.all([
        contracts.Storage.deployed(),
        contracts.UserManager.deployed(),
        contracts.ContractsManager.deployed(),
        contracts.PendingManager.deployed(),
        contracts.LOCManager.deployed(),
        contracts.ChronoBankPlatform.deployed(),
        contracts.ChronoBankAsset.deployed(),
        contracts.ChronoBankAssetWithFee.deployed(),
        contracts.ChronoBankAssetProxy.deployed(),
        contracts.ChronoBankAssetWithFeeProxy.deployed(),
        contracts.AssetsManager.deployed(),
        contracts.ERC20Manager.deployed(),
        contracts.ExchangeManager.deployed(),
        contracts.Rewards.deployed(),
        contracts.Vote.deployed(),
        contracts.TimeHolder.deployed(),
        contracts.ChronoBankPlatformEmitter.deployed(),
        contracts.EventsHistory.deployed(),
        contracts.MultiEventsHistory.deployed()
      ])*/
    ).then(() => {
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
        instances.ChronoBankAsset.init(contracts.ChronoBankAssetProxy.address, {from: accounts[0]}),
        instances.ChronoBankAssetWithFee.init(contracts.ChronoBankAssetWithFeeProxy.address, {from: accounts[0]}),
        instances.ChronoBankAssetProxy.init(contracts.ChronoBankPlatform.address, TIME_SYMBOL, TIME_NAME, {from: accounts[0]}),
        instances.ChronoBankAssetWithFeeProxy.init(contracts.ChronoBankPlatform.address, LHT_SYMBOL, LHT_NAME, {from: accounts[0]}),
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
      console.log('--add to chronoBankPlatform');
      return instances.ChronoBankPlatform.setupEventsHistory(
        contracts.EventsHistory.address,
        {from: accounts[0], gas: 3000000});
    }).then(() => {
      const platformEvent = [
        'emitTransfer',
        'emitIssue',
        'emitRevoke',
        'emitOwnershipChange',
        'emitApprove',
        'emitRecovery',
        'emitError'
      ];
      return Promise.all(platformEvent.map(event => {
        console.log(`--addEmitter chronoBankPlatformEmitter.${event}`);
        return instances.EventsHistory.addEmitter(instances.ChronoBankPlatformEmitter.contract[event].getData.apply(this, fakeArgs).slice(0, 10),
          instances.ChronoBankPlatformEmitter.address,
          {from: accounts[0], gas: 3000000}
        );
      })).catch(e => console.error('emitter error', e));
    }).then(() => {
      console.log('--update version in chronoBankPlatform');
      return instances.EventsHistory.addVersion(instances.ChronoBankPlatform.address, 'Origin', 'Initial version.');
    }).catch(e => console.error(e => 'eventHistory error', e))
    .then(() => {
      callback();
    }).catch(function(e) {
      console.log(e);
    });
};

module.exports.setup = setup;
module.exports.contracts = instances;
