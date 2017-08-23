const config = require ('../../config'),
  mongoose = require ('mongoose'),
  transactionModel = require ('../../models/transactionModel'),
  accountModel = require ('../../models/accountModel'),
  Web3 = require ('web3'),
  net = require ('net'),
  bunyan = require ('bunyan'),
  Promise = require('bluebird'),
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

  let provider = new Web3.providers.IpcProvider (config.web3.uri, net);
  const web3 = new Web3 ();
  web3.setProvider (provider);

  try {
    await channel.assertExchange ('events', 'topic', {durable: false});
    await channel.assertQueue ('app_eth.balance_processor');
    await channel.bindQueue ('app_eth.balance_processor', 'events', 'eth_transaction.*');
  } catch (e) {
    log.error (e);
    channel = await conn.createChannel ();
  }

  channel.consume ('app_eth.balance_processor', async (data) => {
    let blockPayload;
    try {
      blockPayload = JSON.parse (data.content.toString ());
    } catch (e) {
      log.error (e);
      return;
    }

    let tx = await transactionModel.findOne ({payload: blockPayload});
    let accounts = await accountModel.find ({address: {$in: [tx.to, tx.from]}});
    let balances = await Promise.all (
      accounts.map (account =>
        Promise.promisify (web3.eth.getBalance) (account.address)
      )
    );

    accounts = accounts.map ((account, i) => {
      account.balance = balances[i];
      return account;
    });


    await Promise.all (accounts.map (account =>
      accountModel.update ({address: account.address}, {$set: {balance: account.balance}}).catch (() => {
      })
    ));

    await Promise.all (accounts.map (account =>
      channel.publish ('events', `eth_balance.${account.address}`, new Buffer (JSON.stringify (account.balance)))
    ));

  }, {noAck: true});

};

module.exports = init ();
