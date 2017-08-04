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

  constructor(connection) {
    this.connection = connection;
  }

  createChannel() {
    return this.connection.createChannel()
      .then(ch => {
        this.channel = ch;

        ch.on('error', () => {
        });

        return ch;
      });
  }

  on(event, callback) {
    let consumerTag = (+new Date()).toString();
    this.channel.assertQueue(event, {durable: true})
      .then(() => {
        this.channel.consume(event, data => callback(data.content.toString()), {
          noAck: false,
          consumerTag: consumerTag
        });
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
    .then(conn => new AmqpController(conn))
    .then(instance => instance.createChannel()
      .then(() => instance)
    );
};