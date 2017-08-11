const _ = require('lodash'),
  eventListenerModel = require('../models/eventListenerModel');

/**
 * @module scheduleService
 * @description ping ipfs by specified time in config
 * @see {@link ../../../config.json}
 */

module.exports = async(ev, ctx, data) => {

  let listeners = await eventListenerModel.find({event: ev.toLowerCase()});

  let channel = await ctx.amqpInstance.createChannel();

  await _.chain(listeners)
    .filter(listener =>
      _.isEqual(listener.filter, _.pick(data, _.keys(listener.filter)))
    )
    .map(async listener => {
      try {
        return await channel.publish(`events:${listener.controlIndexHash}`, '', Buffer.from(JSON.stringify(data)));
      } catch (e) {
        channel = await ctx.amqpInstance.createChannel();
      }
    })
    .value();

  await channel.close();

};