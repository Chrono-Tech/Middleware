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

  channel.on('error', async () => {
    console.log('super error');
    conn = await amqp.connect(config.rabbit.url);
    channel = await conn.createChannel();

    if(events.length)
      events.forEach(ev=>on(ev.event, ev.callback, ev.consumerTag))


  });

  let on = async(event, callback, consumerTag = (+new Date()).toString()) => {
    events.push({event, callback, consumerTag});
    let check = await channel.checkQueue('2342');
    console.log('super check', check);
    await channel.assertQueue(event, {durable: true});
    channel.consume(event, data => callback(data.content.toString()), {
      noAck: false,
      consumerTag: consumerTag
    });

  };

  let emit = (event, data) => {
    channel.sendToQueue(event, Buffer.from((JSON.stringify(data)).toString()), {
      deliveryMode: true,
      noAck: false
    });
  };

  let createExchange = async(ex, channel_id) => {
    return await Promise.all([
      channel.assertExchange(ex, 'fanout', {durable: false}),
      channel.assertQueue(channel_id, {exclusive: true, durable: false}),
      channel.bindQueue(channel_id, ex, '')
    ]).catch(e=>{});
  };

  let publish = () => {
    channel.publish(`events:${listener.controlIndexHash}`, '', Buffer.from(JSON.stringify(data)))
  };

  return {on, emit, createExchange, publish}

};