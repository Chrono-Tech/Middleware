const Web3 = require('web3'),
  web3 = new Web3(),
  contract = require('truffle-contract'),
  config = require('../../config.json'),
  provider = new Web3.providers.HttpProvider(config.web3.url),
  path = require('path'),
  Promise = require('bluebird');

web3.setProvider(provider);

const contracts = require('require-all')({
  dirname: path.join(__dirname, '../../SmartContracts/build/contracts'),
  filter: /(^((ChronoBankPlatformEmitter)|(?!(Emitter)).)*)\.json$/,
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

const contractTypes = {
  LOCManager: 0, // LOCManager
  PendingManager: 1, // PendingManager
  UserManager: 2, // UserManager
  ERC20Manager: 3, // ERC20Manager
  ExchangeManager: 4, // ExchangeManager
  TrackersManager: 5, // TrackersManager
  Voting: 6, // Voting
  Rewards: 7, // Rewards
  AssetsManager: 8, // AssetsManager
  TimeHolder: 9 //TimeHolder
};

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
let multiEventsHistory;

let accounts;


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
    }).then(() => {
      console.log('deploy contracts');
      return Promise.all([
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
      ]);
    }).then((instances) => {
    [
        storage,
        userManager,
        contractsManager,
        shareable,
        chronoMint,
        chronoBankPlatform,
        chronoBankAsset,
        chronoBankAssetWithFee,
        chronoBankAssetProxy,
        chronoBankAssetWithFeeProxy,
        assetsManager,
        erc20Manager,
        exchangeManager,
        rewards,
        vote,
        timeHolder,
        chronoBankPlatformEmitter,
        eventsHistory,
        multiEventsHistory
      ] = instances;

    }).then(() => {
      module.exports.storage = storage;
      module.exports.accounts = accounts;
      module.exports.assetsManager = assetsManager;
      module.exports.chronoBankPlatform = chronoBankPlatform;
      module.exports.chronoMint = chronoMint;
      module.exports.contractsManager = contractsManager;
      module.exports.timeHolder = timeHolder;
      module.exports.shareable = shareable;
      module.exports.eventsHistory = eventsHistory;
      module.exports.erc20Manager = erc20Manager;
      module.exports.chronoBankPlatformEmitter = chronoBankPlatformEmitter;
      module.exports.rewards = rewards;
      module.exports.userManager = userManager;
      module.exports.exchangeManager = exchangeManager;
      module.exports.chronoBankAsset = chronoBankAsset;
      module.exports.chronoBankAssetProxy = chronoBankAssetProxy;
      module.exports.chronoBankAssetWithFee = chronoBankAssetWithFee;
      module.exports.chronoBankAssetWithFeeProxy = chronoBankAssetWithFeeProxy;
      module.exports.vote = vote;
      module.exports.multiEventsHistory = multiEventsHistory;
    }).then(() => {
      console.log('link addresses');
      Promise.all([
        contractsManager.init(),
        userManager.init(contracts.ContractsManager.address),
        shareable.init(contracts.ContractsManager.address),
        chronoMint.init(contracts.ContractsManager.address)
      ])

    }).then(() =>
      Promise.each([
        erc20Manager.init(contracts.ContractsManager.address),
        exchangeManager.init(contracts.ContractsManager.address),
        rewards.init(contracts.ContractsManager.address, 0),
        vote.init(contracts.ContractsManager.address),
        timeHolder.init(contracts.ContractsManager.address, contracts.ChronoBankAssetProxy.address),
        chronoBankAsset.init(contracts.ChronoBankAssetProxy.address, {from: accounts[0]}),
        chronoBankAssetWithFee.init(contracts.ChronoBankAssetWithFeeProxy.address, {from: accounts[0]}),
        chronoBankAssetProxy.init(contracts.ChronoBankPlatform.address, TIME_SYMBOL, TIME_NAME, {from: accounts[0]}),
        chronoBankAssetWithFeeProxy.init(contracts.ChronoBankPlatform.address, LHT_SYMBOL, LHT_NAME, {from: accounts[0]}),
        timeHolder.addListener(rewards.address),
        timeHolder.addListener(vote.address),
        userManager.setupEventsHistory(multiEventsHistory.address),
        multiEventsHistory.authorize(userManager.address),
        shareable.setupEventsHistory(multiEventsHistory.address),
        multiEventsHistory.authorize(shareable.address),
        chronoMint.setupEventsHistory(multiEventsHistory.address),
        multiEventsHistory.authorize(chronoMint.address),
        erc20Manager.setupEventsHistory(multiEventsHistory.address),
        multiEventsHistory.authorize(erc20Manager.address),
        assetsManager.setupEventsHistory(multiEventsHistory.address),
        multiEventsHistory.authorize(assetsManager.address),
        exchangeManager.setupEventsHistory(multiEventsHistory.address),
        multiEventsHistory.authorize(exchangeManager.address),
        rewards.setupEventsHistory(multiEventsHistory.address),
        multiEventsHistory.authorize(rewards.address),
        vote.setupEventsHistory(multiEventsHistory.address),
        multiEventsHistory.authorize(vote.address),
      ])
    )
    .then(() => {
      console.log('--add to chronoBankPlatform');
      return chronoBankPlatform.setupEventsHistory(
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
        return eventsHistory.addEmitter(chronoBankPlatformEmitter.contract[event].getData.apply(this, fakeArgs).slice(0, 10),
          chronoBankPlatformEmitter.address,
          {from: accounts[0], gas: 3000000}
        );
      })).catch(e => console.error('emitter error', e));
    }).then(() => {
      console.log('--update version in chronoBankPlatform');
      return eventsHistory.addVersion(chronoBankPlatform.address, 'Origin', 'Initial version.');
    }).catch(e => console.error(e => 'eventHistory error', e))
    .then(() => {
      callback();
    }).catch(function(e) {
      console.log(e);
    });
};

module.exports.setup = setup;
module.exports.contractTypes = contractTypes;

