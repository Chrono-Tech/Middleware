const _ = require('lodash'),
  Web3 = require('web3'),
  web3 = new Web3(),
  config = require('../config.json'),
  require_all = require('require-all'),
  path = require('path'),
  contract = require("truffle-contract"),
  emitter = require('events'),
  mongoose = require('mongoose'),
  contracts = require_all({
    dirname: path.join(__dirname, '..', 'SmartContracts', 'build', 'contracts'),
    filter: /(.+)\.json$/,
  });

module.exports = () => {

  const provider = new Web3.providers.HttpProvider(config.web3.url);

  web3.setProvider(provider);

  let eventModels = _.chain(contracts)
    .values()
    .reject(c => _.isEmpty(c.networks))
    .map(contract => _.filter(contract.abi, {type: 'event'}))
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

  let contracts_scope = _.chain(contracts)
    .reject(c => _.isEmpty(c.networks))
    .map(c => {
      let Contract = contract(c);
      Contract.defaults({from: web3.eth.coinbase});
      Contract.setProvider(provider);
      return Contract;
    })
    .value();


  return {
    eventModels: eventModels,
    contracts: contracts_scope
  }

};