const Web3 = require('web3'),
  contract = require('truffle-contract'),
  path = require('path'),
  net = require('net'),
  require_all = require('require-all'),
  _ = require('lodash'),
  bunyan = require('bunyan'),
  log = bunyan.createLogger({name: 'controllers.contractsCtrl'}),
  Promise = require('bluebird');

/**
 * @module contracts Controller
 * @description initialize all contracts and web3
 * @param network - network's name
 * @returns {Promise|Promise.<{instances, contracts, web3}>}
 */

module.exports = async(network) => {

  const instances = {},
    provider = new Web3.providers.IpcProvider(`${/^win/.test(process.platform) ? '\\\\.\\pipe\\' : '/tmp/'}${network}/geth.ipc`, net);
  const web3 = new Web3(),
    contracts = require_all({ //scan dir for all smartContracts, excluding emitters (except ChronoBankPlatformEmitter) and interfaces
      dirname: path.join(__dirname, '../node_modules', 'chronobank-smart-contracts/build/contracts'),
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
  await Promise.each(
    _.values(contracts),
    contract =>
      contract.deployed()
        .then(instance => {
          return _.set(instances, contract.toJSON().contract_name, instance);
        }).catch((e) => {
          log.debug(e);
        })
  );

  return {instances, contracts, web3};

};
