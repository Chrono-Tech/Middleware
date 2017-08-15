const _ = require('lodash'),
  transactionModel = require('../../../models/transactionModel');

/**
 * @module scheduleService
 * @description ping ipfs by specified time in config
 * @see {@link ../../../config.json}
 */

module.exports = async(ctx, tx) => {

  let channel = await ctx.amqpInstance.createChannel();

  await _.chain([tx.from, tx.to])
    .filter(address =>
      ctx.users.includes(address)
    )
    .forEach(async address => {
      try {
        return await channel.publish(`events:${address}`, '', Buffer.from(JSON.stringify(tx)));
      } catch (e) {
        channel = await ctx.amqpInstance.createChannel();
      }

    })
    .value();

  await channel.close();

};