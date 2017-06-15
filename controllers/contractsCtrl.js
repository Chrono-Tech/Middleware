const Web3 = require('web3'),
  contract = require('truffle-contract'),
  path = require('path'),
  require_all = require('require-all'),
  _ = require('lodash'),
  bunyan = require('bunyan'),
  log = bunyan.createLogger({name: 'controllers.contractsCtrl'}),
  Promise = require('bluebird');

const TIME_SYMBOL = 'TIME';
const TIME_NAME = 'Time Token';

const LHT_SYMBOL = 'LHT';
const LHT_NAME = 'Labour-hour Token';

const fakeArgs = [0, 0, 0, 0, 0, 0, 0, 0];

module.exports = (provider_config) => {

  const accounts = [],
    instances = {},
    contracts = {},
    web3 = new Web3();

  let provider = new Web3.providers.HttpProvider(`http://${provider_config.host}:${provider_config.port}`);
  web3.setProvider(provider);

  return new Promise(resolve => {

    if (provider_config.from) {
      accounts.push(provider_config.from);
      return resolve();
    }

    web3.eth.getAccounts((err, acc) => {
      accounts.push(...acc);
      resolve();
    });
  })
    .then(() =>
      Promise.resolve(
        require_all({
          dirname: path.join(__dirname, '../SmartContracts/build/contracts'),
          filter: /(^((ChronoBankPlatformEmitter)|(?!(Emitter|Interface)).)*)\.json$/,
          resolve: Contract => {
            let c = contract(Contract);
            c.defaults({from: accounts[0], gas: 3000000});
            c.setProvider(provider);
            return c;
          }
        })
      )
    )
    .then((contracts_set) => {
      _.merge(contracts, contracts_set);
      return Promise.all(
        _.map(contracts, c =>
          c.deployed()
            .then(instance => {
              return _.set(instances, c.toJSON().contract_name, instance);
            }).catch(err => {
          })
        )
      );
    })
    .then(() => {
      log.info('init manager...');
      return Promise.each([
          instances.ContractsManager.init.call.bind(this),
          instances.UserManager.init.call.bind(this, contracts.ContractsManager.address),
          instances.PendingManager.init.call.bind(this, contracts.ContractsManager.address),
          instances.LOCManager.init.call.bind(this, contracts.ContractsManager.address)
        ], (item) =>
          item()
            .catch(err => log.error(err))
      );
    })
    .then(() => {
      log.info('init platform...');
      return Promise.each([
        instances.ERC20Manager.init.call.bind(this, contracts.ContractsManager.address),
        instances.ExchangeManager.init.call.bind(this, contracts.ContractsManager.address),
        instances.Rewards.init.call.bind(this, contracts.ContractsManager.address, 0),
        instances.Vote.init.call.bind(this, contracts.ContractsManager.address),
        instances.TimeHolder.init.call.bind(this, contracts.ContractsManager.address, contracts.ChronoBankAssetProxy.address),
        instances.ChronoBankAsset.init.call.bind(this, contracts.ChronoBankAssetProxy.address, {from: accounts[0]}),
        instances.ChronoBankAssetWithFee.init.call.bind(this, contracts.ChronoBankAssetWithFeeProxy.address, {from: accounts[0]}),
        instances.ChronoBankAssetProxy.init.call.bind(this, contracts.ChronoBankPlatform.address, TIME_SYMBOL, TIME_NAME, {from: accounts[0]}),
        instances.ChronoBankAssetWithFeeProxy.init.call.bind(this, contracts.ChronoBankPlatform.address, LHT_SYMBOL, LHT_NAME, {from: accounts[0]}),
        instances.TimeHolder.addListener.call.bind(this, instances.Rewards.address),
        instances.TimeHolder.addListener.call.bind(this, instances.Vote.address),
        instances.UserManager.setupEventsHistory.call.bind(this, instances.MultiEventsHistory.address),
        instances.MultiEventsHistory.authorize.call.bind(this, instances.UserManager.address),
        instances.PendingManager.setupEventsHistory.call.bind(this, instances.MultiEventsHistory.address),
        instances.MultiEventsHistory.authorize.call.bind(this, instances.ChronoBankAsset.address),
        instances.LOCManager.setupEventsHistory.call.bind(this, instances.MultiEventsHistory.address),
        instances.MultiEventsHistory.authorize.call.bind(this, instances.PendingManager.address),
        instances.ERC20Manager.setupEventsHistory.call.bind(this, instances.MultiEventsHistory.address),
        instances.MultiEventsHistory.authorize.call.bind(this, instances.ERC20Manager.address),
        instances.AssetsManager.setupEventsHistory.call.bind(this, instances.MultiEventsHistory.address),
        instances.MultiEventsHistory.authorize.call.bind(this, instances.AssetsManager.address),
        instances.ExchangeManager.setupEventsHistory.call.bind(this, instances.MultiEventsHistory.address),
        instances.MultiEventsHistory.authorize.call.bind(this, instances.ExchangeManager.address),
        instances.Rewards.setupEventsHistory.call.bind(this, instances.MultiEventsHistory.address),
        instances.MultiEventsHistory.authorize.call.bind(this, instances.Rewards.address),
        instances.Vote.setupEventsHistory.call.bind(this, instances.MultiEventsHistory.address),
        instances.MultiEventsHistory.authorize.call.bind(this, instances.Vote.address)
      ], (item) =>
        item()
          .catch(err => log.error(err)));
    })
    .then(() =>
      Promise.each(
        _.chain(instances.ChronoBankPlatformEmitter.abi)
          .filter(event =>
            event.type === 'event' &&
            _.has(instances.ChronoBankPlatformEmitter.contract[event.name], 'getData')
          )
          .map(ev => {
            return instances.EventsHistory.addEmitter.call.bind(this, instances.ChronoBankPlatformEmitter.contract[ev.name].getData.apply(this, fakeArgs).slice(0, 10),
              instances.ChronoBankPlatformEmitter.address,
              {from: accounts[0], gas: 3000000}
            );
          })
          .union([
            instances.ChronoBankPlatform.setupEventsHistory.call.bind(
              this,
              contracts.EventsHistory.address,
              {from: accounts[0], gas: 3000000}),
            instances.EventsHistory.addVersion.call.bind(this, instances.ChronoBankPlatform.address, 'Origin', 'Initial version.')
          ])
          .value(), (item) =>
          item()
            .catch(err => log.error(err))
      )
    )
    .then(() =>
      Promise.resolve({instances, contracts})
    )
    .catch(err => log.error(err));
};