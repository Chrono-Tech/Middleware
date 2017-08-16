/**
 * @module scheduleService
 * @description ping ipfs by specified time in config
 * @see {@link ../../../config.json}
 */

module.exports = async(ev, ctx, data) => {

  let channel = await ctx.amqpInstance.createChannel();

  try {
    await channel.assertExchange('events', 'direct', {durable: false});
  } catch (e) {
    channel = await ctx.amqpInstance.createChannel();
  }

  try {
    await  channel.publish('events', ev.toLowerCase(), new Buffer(JSON.stringify(data)));
  } catch (e) {
  }

  await channel.close();

};