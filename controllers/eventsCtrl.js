const _ = require('lodash'),
  utils = require('web3/lib/utils/utils.js'),
  mongoose = require('mongoose');

/**
 * @module contracts Controller
 * @description initialize all events for smartContracts,
 * and prepare collections in mongo for them
 * @returns {{eventModels, initEmitter, contracts: (Function|*)}}
 */

module.exports = (contracts, web3) => {

  let eventModels = _.chain(contracts)
    .map(value =>
      _.chain(value).get('abi')
        .filter({type: 'event'})
        .value()
    )
    .flatten()
    .uniqBy('name')
    .transform((result, ev) => {
      result[ev.name] = mongoose.model(ev.name, new mongoose.Schema(
        _.chain(ev.inputs).transform((result, obj) => {
          result[obj.name] = {
            type: new RegExp(/uint/).test(obj.type) ?
              Number : mongoose.Schema.Types.Mixed
          };
        }, {}).merge({
          network: {type: String},
          created: {type: Date, required: true, default: Date.now}
        }).value()
      ));
    }, {})
    .value();

  let signatures = _.chain(contracts)
      .values()
      .map(c => c.abi)
      .flattenDeep()
      .filter({type: 'event'})
      .transform((result, ev) => {
        result[web3.sha3(utils.transformToFullName(ev))] = ev;
      }, {})
      .value();

  return {eventModels, signatures};

};