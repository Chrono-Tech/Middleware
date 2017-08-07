const _ = require('lodash'),
  bunyan = require('bunyan'),
  Promise = require('bluebird'),
  eventListenerModel = require('../models/eventListenerModel'),
  amqpCtrl = require('../models/eventListenerModel'),
  log = bunyan.createLogger({name: 'plugins.rest.services.eventEmitter.eventEmitterService'});
/**
 * @module scheduleService
 * @description ping ipfs by specified time in config
 * @see {@link ../../../config.json}
 */

module.exports = async (ctx) => {

  ctx.amqpEmitter.on('events:register', data => {//todo reassign on fail
    let payload = JSON.parse(data);

    let ex = `events:${payload.id}`;
    console.log('ex', ex);
    let channel_id = `${ex}.${payload.client}`;


    ctx.amqpEmitter.createExchange(ex, channel_id);

  });

};