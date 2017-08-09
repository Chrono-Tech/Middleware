const _ = require('lodash'),
  bunyan = require('bunyan'),
  eventListenerModel = require('../models/eventListenerModel'),
  log = bunyan.createLogger({name: 'plugins.rest.services.eventEmitter.eventEmitterService'});
/**
 * @module scheduleService
 * @description ping ipfs by specified time in config
 * @see {@link ../../../config.json}
 */

module.exports = async(ctx) => {

  let instance = await ctx.amqpEmitter.queue('events:register');

  let chain = Promise.resolve();

  instance.on(data => {//todo reassign on fail
    let payload = JSON.parse(data);

    let ex = `events:${payload.id}`;
    console.log('ex', ex);
    let channel_id = `${ex}.${payload.client}`;

    chain = chain.then(() =>
      ctx.amqpEmitter.exchange(ex, channel_id)
    );
  });

};