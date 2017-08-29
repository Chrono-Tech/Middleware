const config = require('../../config'),
  mongoose = require('mongoose'),
  transactionModel = require('../../models/transactionModel'),
  accountModel = require('../../models/accountModel'),
  Web3 = require('web3'),
  filterTxsBySMEventsService = require('./services/filterTxsBySMEventsService'),
  net = require('net'),
  path = require('path'),
  fs = require('fs'),
  _ = require('lodash'),
  requireAll = require('require-all'),
  contract = require('truffle-contract'),
  bunyan = require('bunyan'),
  log = bunyan.createLogger({name: 'core.chronoSCProcessor'}),
  amqp = require('amqplib');

let contracts = {},
  smEvents = {};

let contractsPath = path.join(__dirname, '../../node_modules', 'chronobank-smart-contracts/build/contracts');

if (fs.existsSync(contractsPath)) {
  contracts = requireAll({ //scan dir for all smartContracts, excluding emitters (except ChronoBankPlatformEmitter) and interfaces
    dirname: contractsPath,
    filter: /(^((ChronoBankPlatformEmitter)|(?!(Emitter|Interface)).)*)\.json$/,
    resolve: Contract => contract(Contract)
  });

  smEvents = require('./controllers/eventsCtrl')(contracts);
}

/**
 * @module entry point
 * @description update balances for accounts, which addresses were specified
 * in received transactions from blockParser via amqp
 */

mongoose.connect(config.mongo.uri);

let init = async () => {

  let conn = await amqp.connect(config.rabbit.url);
  let channel = await conn.createChannel();

  let provider = new Web3.providers.IpcProvider(config.web3.uri, net);
  const web3 = new Web3();
  web3.setProvider(provider);

  if (!_.has(contracts, 'MultiEventsHistory')) {
    log.error('smart contracts are not installed!');
    return process.exit(1);
  }

  contracts.MultiEventsHistory.setProvider(web3.currentProvider);
  let multiAddress = null;
  try {
    multiAddress = await contracts.MultiEventsHistory.deployed();
  } catch (e) {
    log.error('smart contracts are not deployed!');
    return process.exit(1);
  }

  await accountModel.update({address: multiAddress.address}, {$set: {address: multiAddress.address}}, {
    upsert: true,
    setDefaultsOnInsert: true
  });

  try {
    await channel.assertExchange('events', 'topic', {durable: false});
    await channel.assertQueue('app_eth.chrono_sc_processor');
    await channel.bindQueue('app_eth.chrono_sc_processor', 'events', 'eth_transaction.*');
  } catch (e) {
    log.error(e);
    channel = await conn.createChannel();
  }

  channel.consume('app_eth.chrono_sc_processor', async (data) => {
    let blockPayload;
    channel.ack(data);
    try {
      blockPayload = JSON.parse(data.content.toString());
    } catch (e) {
      log.error(e);
      return;
    }

    let tx = await transactionModel.findOne({payload: blockPayload});

    if (!tx)
      return;

    let filtered = await filterTxsBySMEventsService(tx, web3, multiAddress, smEvents);

    await Promise.all(
      filtered.map(ev => ev.payload.save().catch(() => {
      }))
    );

    await Promise.all(filtered.map(event =>
      channel.publish('events', `eth_chrono_sc.${event.name}`, new Buffer(JSON.stringify(event.payload)))
    ));

  });

};

module.exports = init();
