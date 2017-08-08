const _ = require('lodash'),
  bunyan = require('bunyan'),
  Promise = require('bluebird'),
  config = require('../config'),
  emitter = require('events'),
  log = bunyan.createLogger({name: 'plugins.rest.services.eventEmitter.eventEmitterService'}),
  amqp = require('amqplib');

/**
 * @module scheduleService
 * @description ping ipfs by specified time in config
 * @see {@link ../../../config.json}
 */


module.exports = async() => {

  let events = [];
  //let eventEmitter = new emitter();
  let conn = await amqp.connect(config.rabbit.url);
  let channel = await conn.createChannel();

  let channelWrapper = async(f) => {

    console.log('inside')
    let eventEmitter = new emitter();

    let errorPromise = new Promise(res =>
      channel.once('error', (e) => {
        console.log('super error');
        conn.createChannel()
          .then(conn => channel = conn)
          .then(() => {
            if (events.length)
              events.forEach(ev => {
                channel.consume(ev.event, data => {
                  channel.ack(data);
                  ev.callback(data.content.toString())
                }, {
                  noAck: false,
                  consumerTag: ev.consumerTag
                });
              })
          })
          .then(() => {
            console.log('will resolve');
            res()
          })
      })
    );

    let successPromise = new Promise(res =>
      eventEmitter.once('done', res)
    );

    console.log('await');
    return await Promise.some([
      errorPromise,
      successPromise,
      f()
        .then((data) => {
          eventEmitter.emit('done');
          return data;
        })
        .catch(() => {})
    ], 2)
  };

  let queue = async(name) => {
    await channelWrapper(channel.checkQueue.bind(channel, name));
    await channelWrapper(channel.assertQueue.bind(channel, name, {durable: true}));
    return {
      on: on.bind(this, name),
      emit: emit.bind(this, name)
    };
  };

  let on = async(event, callback, consumerTag = (+new Date()).toString()) => {
    events.push({event, callback, consumerTag});
    await channelWrapper(
      channel.consume.bind(channel, event, data => {
        channel.ack(data);
        callback(data.content.toString())
      }, {
        noAck: false,
        consumerTag: consumerTag
      })
    )
  };

  let emit = (event, data) => {
    channel.sendToQueue(event, Buffer.from((JSON.stringify(data)).toString()), {
      deliveryMode: true,
      noAck: false
    });
  };

  let exchange = async(ex, channel_id) => {
    await channelWrapper(channel.assertExchange.bind(channel, ex, 'fanout'));
    await channelWrapper(channel.assertQueue.bind(channel, channel_id, {exclusive: true}));
    console.log('test')
    return await channelWrapper(channel.bindQueue.bind(channel, channel_id, ex, ''));
  };

  let publish = () => {
    channel.publish(`events:${listener.controlIndexHash}`, '', Buffer.from(JSON.stringify(data)))
  };

  return {queue, exchange, publish}

};