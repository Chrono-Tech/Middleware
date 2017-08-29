const _ = require('lodash'),
  requireAll = require('require-all'),
  path = require('path'),
  fs = require('fs'),
  mongoose = require('mongoose'),
  contract = require('truffle-contract');

let contracts = {};

let contractsPath = path.join(__dirname, '../../../node_modules', 'chronobank-smart-contracts/build/contracts');

if (fs.existsSync(contractsPath)) {
  contracts = requireAll({ //scan dir for all smartContracts, excluding emitters (except ChronoBankPlatformEmitter) and interfaces
    dirname: contractsPath,
    filter: /(^((ChronoBankPlatformEmitter)|(?!(Emitter|Interface)).)*)\.json$/,
    resolve: Contract => contract(Contract)
  });
}

/**
 * @module events Controller
 * @description initialize all events for smartContracts,
 * @returns {{eventModels, signatures}}
 */

module.exports = () => {

  return _.chain(contracts)
    .map(value => //fetch all events
      _.chain(value).get('abi')
        .filter({type: 'event'})
        .value()
    )
    .flatten()
    .groupBy('name')
    .map(ev => ({
      name: ev[0].name,
      inputs: _.chain(ev)
          .map(ev => ev.inputs)
          .flattenDeep()
          .uniqBy('name')
          .value()
    })
    )
    .transform((result, ev) => { //build mongo model, based on event definition from abi

      result[ev.name] = mongoose.model(ev.name, new mongoose.Schema(
        _.chain(ev.inputs)
          .transform((result, obj) => {
            result[obj.name] = {
              type: new RegExp(/uint/).test(obj.type) ?
                Number : mongoose.Schema.Types.Mixed
            };
          }, {})
          .merge({
            controlIndexHash: {type: String, unique: true, required: true},
            network: {type: String},
            created: {type: Date, required: true, default: Date.now}
          })
          .value()
      ));
    }, {})
    .value();
};