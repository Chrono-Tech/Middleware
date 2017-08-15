const _ = require('lodash'),
  express = require('express'),
  eventEmitterService = require('./services/eventsEmitterService'),
  txEmitterService = require('./services/txEmitterService'),
  eventsConsumerRegistrationService = require('./services/eventsConsumerRegistrationService'),
  routes = require('./routes');

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

  let router = express.Router();
  routes(ctx, router);

  ctx.express.use('/eventlistener', router);

  eventsConsumerRegistrationService(ctx);
  _.chain(ctx.eventModels)
    .keys()
    .forEach(event => {
      ctx.events.on(event, data => {
        eventEmitterService(event, ctx, data);
      });
    })
    .value();

  ctx.events.on('transaction', data => {
    txEmitterService(ctx, data);
  });


};