/**
 * @module scheduleService
 * @description ping ipfs by specified time in config
 * @see {@link ../../../config.json}
 */

module.exports = async(ctx) => {

  let allocateChannel = async() => {
    let channel = await ctx.amqpInstance.createChannel();
    channel.on('error', () => {
    });
    return channel;
  };

  let chain = Promise.resolve();

  let channel = await allocateChannel();

  try {
    await channel.checkQueue('events:register');
    await channel.assertQueue('events:register');
  } catch (e) {
    channel = await allocateChannel();
  }

  channel.consume('events:register', async data => {
    channel.ack(data);
    let payload;
    try {
      payload = JSON.parse(data.content.toString());
    } catch (e) {
      return;
    }

    let ex = `events:${payload.id}`;
    let channel_id = `${ex}.${payload.client}`;
    let channel_ex = await allocateChannel();

    try {
      await chain;
    } catch (e) {
      channel_ex = await allocateChannel();
    }

    try {
      await channel_ex.assertExchange(ex, 'fanout');
    } catch (e) {
      channel_ex = await allocateChannel();
    }

    try {
      await channel_ex.assertQueue(channel_id);
    } catch (e) {
      channel_ex = await allocateChannel();
    }

    try {
      chain = await channel.bindQueue(channel_id, ex, '')
        .catch(() => {
        })
        .then(() => channel_ex.close());
    } catch (e) {

    }

  });

};