const _ = require('lodash'),
  transactionModel = require('../../../models/transactionModel');

/**
 * @module scheduleService
 * @description ping ipfs by specified time in config
 * @see {@link ../../../config.json}
 */

module.exports = async(ctx, tx) => {

  let channel = await ctx.amqpInstance.createChannel();

  await
    _.forEach([tx.from, tx.to], async address => {
      try {
        return await channel.publish(`events:${address}`, '', Buffer.from(JSON.stringify(tx)));
      } catch (e) {
        channel = await ctx.amqpInstance.createChannel();
      }
    });

  await channel.close();

};