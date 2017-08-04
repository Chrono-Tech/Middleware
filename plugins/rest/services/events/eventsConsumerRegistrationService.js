const _ = require('lodash'),
  bunyan = require('bunyan'),
  Promise = require('bluebird'),
  eventListenerModel = require('../../models/eventListenerModel'),
  log = bunyan.createLogger({name: 'plugins.rest.services.eventEmitter.eventEmitterService'});
/**
 * @module scheduleService
 * @description ping ipfs by specified time in config
 * @see {@link ../../../config.json}
 */

module.exports = (ctx) => {

  ctx.amqpEmitter.on('events:register', data => {//todo reassign on fail
    let payload = JSON.parse(data);

    let ex = `events:${payload.id}`;
    console.log('ex', ex);
    let channel_id = `${ex}.${payload.client}`;


    ctx.amqpEmitter.channel.assertExchange(ex, 'fanout', {durable: false})
      .then(() =>
        ctx.amqpEmitter.channel.assertQueue(channel_id, {exclusive: true, durable: false})
      )
      .catch(() => {
        console.log('no such queue');
        return ctx.amqpEmitter.createChannel();
      })
      .then(() =>
        ctx.amqpEmitter.channel.bindQueue(channel_id, ex, '')
      )
      .catch(() => {
        console.log('can\'t bind queue');
        return ctx.amqpEmitter.createChannel();
      });

  });

};