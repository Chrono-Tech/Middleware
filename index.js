const mongoose = require('mongoose'),
  config = require('./config'),
  blockModel = require('./models').blockModel,
  accountModel = require('./models').accountModel,
  transactionModel = require('./models').transactionModel,
  contractsCtrl = require('./controllers').contractsCtrl,
  eventsCtrl = require('./controllers').eventsCtrl,
  aggregateTxsByBlockService = require('./services/aggregateTxsByBlockService'),
  emitter = require('events'),
  _ = require('lodash'),
  plugins = require('./plugins'),
  bunyan = require('bunyan'),
  log = bunyan.createLogger({name: 'app'}),
  Promise = require('bluebird'),
  listenTxsFromBlockIPCService = require('./services/listenTxsFromBlockIPCService'),
  cluster = require('cluster');

/**
 * @module entry point
 * @description registers all smartContract's events,
 * listen for changes, and notify plugins.
 */

const networks = _.keys(config.web3.networks);
const workers = {};

process.on('exit', code => {

  log.info('master process exit!');

  process.exit(code);
});

process.on('SIGINT', () => {
  log.info('\nCTRL+C...');
  process.exit(0);
});

// Catch uncaught exception
process.on('uncaughtException', err => {
  log.info(err);
  process.exit(1);
});

//clustering the app to worker per network
if (cluster.isMaster) {
  for (let i = 0; i < networks.length; i++) {
    workers[i + 1] = networks[i];
    cluster.fork({network: networks[i]});
  }

  //if worker is down - then we resurrect him
  cluster.on('exit', worker => {
    log.error(`worker with pid:${worker.id} is dead`);

    let network = workers[worker.id];
    let new_id = _.chain(workers).keys().max().toNumber().add(1).value();
    workers[new_id] = network;
    delete workers[worker.id];

    cluster.fork({network: network});
  });

  return;
}

mongoose.connect(config.mongo.uri);

//we expose network name to webworker from muster node
let network = process.env.network;

//init contracts on the following network and fetch the latest block for this network from mongo
Promise.all([
  contractsCtrl(network),
  blockModel.findOne({network: network}).sort('-block'),
  accountModel.find({})
])
  .spread((contracts_ctx, currentBlock, accounts) => {

    if (!_.has(contracts_ctx, 'instances.MultiEventsHistory.address') || !_.has(contracts_ctx, 'instances.EventsHistory.address')) {
      log.info(`contracts haven't been deployed to network - ${network}`);
      log.info('restart process in one hour...');
      return setTimeout(() => process.exit(1), 3600 * 1000);
    }

    accounts = _.map(accounts, a => a.address);
    let contracts = contracts_ctx.contracts;
    let contract_instances = contracts_ctx.instances;
    currentBlock = _.chain(currentBlock).get('block', 0).add(0).value();
    let event_ctx = eventsCtrl(contract_instances, contracts_ctx.web3);
    let eventModels = event_ctx.eventModels;
    let eventEmitter = new emitter();

    log.info(`search from block:${currentBlock} for network:${network}`);
    let txService = listenTxsFromBlockIPCService(network);

    let fetcher = () =>
      new Promise(res => {
        txService.events.emit('getBlock');
        txService.events.once('block', block => {
          res(block);
        });
      })
        .then(block => {

          if (block === -1)
            return Promise.reject({code: 1});

          if (block < currentBlock)
            return Promise.reject({code: 0});

          txService.events.emit('getTxs', currentBlock++);

          return new Promise((resolve, reject) => {
            txService.events.once('txs', (txs) => {
              if (!txs || _.isEmpty(txs))
                return reject({code: 2});
              resolve(txs);
            });
          });
        })
        .then((txs) =>
          Promise.map(txs, tx => {
            return parseInt(tx.value) > 0 ?
              tx : new Promise(res => {
                txService.events.emit('getTxReceipt', tx);
                txService.events.once('txReceipt', res);
              });
          }, {concurrency: 1})
        )
        .then(txs =>
          aggregateTxsByBlockService(txs,
            [contract_instances.MultiEventsHistory.address, contract_instances.EventsHistory.address],
            event_ctx.signatures,
            accounts
          )
        )
        .then((res) => {
          return Promise.all(
            _.chain(res)
              .get('events')
              .map(ev =>
                ev.event === 'NewUserRegistered' ? new eventModels[ev.event](_.merge(ev.args, {network: network})).save()
                  .then(() => new accountModel({network: network, address: ev.args.key}).save())
                  .then(() => accounts.push(ev.args.key)) :
                  new eventModels[ev.event](_.merge(ev.args, {network: network})).save()
              )
              .union([transactionModel.insertMany(res.txs)])
              .value()
          )
            .then(() => {
              _.chain(res)
                .get('events')
                .forEach(ev => {
                  eventEmitter.emit(ev.event, ev.args);
                });
            });
        })
        .then(() =>
          blockModel.findOneAndUpdate({network: network}, {
            block: currentBlock,
            created: Date.now()
          }, {upsert: true})
        )
        .delay(10)
        .then(() => {
          fetcher();
        })
        .catch(err => {
          if (![0, 1, 2, 11000].includes(_.get(err, 'code')))
            --currentBlock;

          if (_.get(err, 'code') === 0)
            log.info(`await for next block ${currentBlock}`);

          if (_.get(err, 'code') === 1)
            log.info(`found a broken block ${currentBlock}`);

          _.get(err, 'code') === 0 ?
            setTimeout(fetcher, 10000) :
            fetcher();
        });

    txService.events.on('connected', () => {
      fetcher();
    });

//register plugins
    _.chain(plugins).values()
      .forEach(plugin => plugin({
        events: eventEmitter,
        contracts_instances: contract_instances,
        eventModels: eventModels,
        contracts: contracts,
        network: network,
        users: accounts
      }))
      .value();

  })
;