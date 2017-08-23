const config = require ('../../config'),
  mongoose = require ('mongoose'),
  pinModel = require ('./models/pinModel'),
  scheduleService = require ('./services/scheduleService'),
  bytes32toBase58 = require ('./helpers/bytes32toBase58'),
  bunyan = require ('bunyan'),
  log = bunyan.createLogger ({name: 'core.balanceProcessor'}),
  amqp = require ('amqplib');

/**
 * @module entry point
 * @description update balances for accounts, which addresses were specified
 * in received transactions from blockParser via amqp
 */

mongoose.connect (config.mongo.uri);

let init = async () => {
  let conn = await amqp.connect (config.rabbit.url);
  let channel = await conn.createChannel ();

  try {
    await channel.assertExchange ('events', 'topic', {durable: false});
    await channel.assertQueue ('app_eth.ipfs');
    await channel.bindQueue ('app_eth.ipfs', 'events', 'sethash');
  } catch (e) {
    log.error (e);
    channel = await conn.createChannel ();
  }

  channel.consume ('app_eth.ipfs', async (data) => {
    let args;
    try {
      args = JSON.parse (data.content.toString ());
    } catch (e) {
      log.error (e);
      return;
    }

    await pinModel.update (
      {hash: bytes32toBase58 (args.oldHash), network: args.network},
      {updated: Date.now (), hash: bytes32toBase58 (args.newHash), network: args.network},
      {upsert: true, setDefaultsOnInsert: true}
    );

  });

  await scheduleService ();

};

module.exports = init ();
