const _ = require('lodash'),
  eventEmitterService = require('./services/eventsEmitterService');

/**
 * @module rest
 * @description expose event collections via rest api
 * @param ctx - context of app, includes {
 *    events: *,
 *    contracts_instances: *,
 *    eventModels: *,
 *    contracts: *
 *    network: *
 *    }
 */

module.exports = (ctx) => {

  _.chain(ctx.eventModels)
    .keys()
    .forEach(event => {
      ctx.events.on(event, data => {
        eventEmitterService(event, ctx, data);
      });
    })
    .value();

  ctx.events.on('transaction', data => {
    eventEmitterService('eth_transaction', ctx, data);
  });


};