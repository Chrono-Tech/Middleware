const _ = require('lodash'),
  bunyan = require('bunyan'),
  Promise = require('bluebird'),
  config = require('../config'),
  log = bunyan.createLogger({name: 'plugins.rest.services.eventEmitter.eventEmitterService'}),
  amqp = require('amqplib');

/**
 * @module scheduleService
 * @description ping ipfs by specified time in config
 * @see {@link ../../../config.json}
 */

class AmqpController {

  constructor(channel) {
    this.channel = channel;
  }

  on(event, callback) {
    let consumerTag = (+new Date()).toString();
    this.channel.assertQueue(event, {durable: true})
      .then(() => {
        this.channel.consume(event, data => callback(data.toString()), {noAck: false, consumerTag: consumerTag});
      });
  }

  emit(event, data) {
    this.channel.sendToQueue(event, Buffer.from((JSON.stringify(data)).toString()), {
      deliveryMode: true,
      noAck: false
    });
  }

  cancel(consumerTag, callback) {
    this.channel.cancel(consumerTag, callback);
  }

}

module.exports = () => {
  return amqp.connect(config.rabbit.url)
    .then(conn => conn.createChannel())
    .then(ch => new AmqpController(ch));
};