const _ = require('lodash'),
  mongoose = require('mongoose');

/**
 * @module contracts Controller
 * @description initialize all events for smartContracts,
 * and prepare collections in mongo for them
 * @returns {{eventModels, initEmitter, contracts: (Function|*)}}
 */

module.exports = (contracts) => {

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

  return {
    eventModels: eventModels
  };

};