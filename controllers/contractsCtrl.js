const Web3 = require('web3'),
  contract = require('truffle-contract'),
  path = require('path'),
  require_all = require('require-all'),
  _ = require('lodash'),
  bunyan = require('bunyan'),
  log = bunyan.createLogger({name: 'controllers.contractsCtrl'}),
  Promise = require('bluebird');

/**
 * @module contracts Controller
 * @description initialize all contracts and web3
 * @param provider_config - single network from truffle-config.js
 * @returns {Promise|Promise.<{instances, contracts, web3}>}
 */

module.exports = (provider_config) => {

  const instances = {},
    provider = new Web3.providers.HttpProvider(`http://${provider_config.host}:${provider_config.port}`),
    web3 = new Web3(),
    contracts = require_all({ //scan dir for all smartContracts, excluding emitters (except ChronoBankPlatformEmitter) and interfaces
      dirname: path.join(__dirname, '../SmartContracts/build/contracts'),
      filter: /(^((ChronoBankPlatformEmitter)|(?!(Emitter|Interface)).)*)\.json$/,
      resolve: Contract => {
        let c = contract(Contract);
        c.defaults({gas: 3000000});
        c.setProvider(provider);
        return c;
      }
    });

  web3.setProvider(provider);

  //get instances and build object {contract_name: instance}
  return Promise.all(
    _.map(contracts, c =>
      c.deployed()
        .then(instance => {
          return _.set(instances, c.toJSON().contract_name, instance);
        }).catch(() => {})
    )
  )
    .then(() =>
      Promise.resolve({instances, contracts, web3})
    )
    .catch(err => log.error(err));
};