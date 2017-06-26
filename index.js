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
  contractsCtrl(config.web3.networks[network]),
  blockModel.findOne({network: network}).sort('-block'),
  accountModel.find({network: network})
])
  .spread((contracts_ctx, currentBlock, accounts) => {

    accounts = _.map(accounts, a=>a.address);
    let contracts = contracts_ctx.contracts;
    let contract_instances = contracts_ctx.instances;
    currentBlock = _.chain(currentBlock).get('block', 0).add(0).value();
    let event_ctx = eventsCtrl(contract_instances, contracts_ctx.web3);
    let eventModels = event_ctx.eventModels;
    let eventEmitter = new emitter();

    log.info(`search from block:${currentBlock} for network:${network}`);
    let txService = listenTxsFromBlockIPCService();

    txService.events.on('connected', () => {

      txService.events.emit('getBlock'); //todo handle update through block
      txService.events.on('block', block => {
        block >= currentBlock ?
          txService.events.emit('getTxs', currentBlock++) :
          setTimeout(() => {
            txService.events.emit('getBlock');
          }, 10000);
      });

      txService.events.on('txs', (txs) => {
        if (!txs || _.isEmpty(txs)) {
          return txService.events.emit('getBlock');
        }

        let res = aggregateTxsByBlockService(txs,
          [contract_instances.MultiEventsHistory.address, contract_instances.EventsHistory.address],
          event_ctx.signatures,
          accounts
        );

        Promise.all(
          _.chain(res.events)
            .map(ev =>
              ev.event === 'SetHash' ? new eventModels[ev.event](_.merge(ev.args, {network: network})).save()
                .then(() => new accountModel({network: network, address: ev.args.key}).save()) :
                new eventModels[ev.event](_.merge(ev.args, {network: network})).save()
            )
            .union([
              transactionModel.insertMany(res.txs),
              blockModel.findOneAndUpdate({network: network}, {
                block: currentBlock,
                created: Date.now()
              }, {upsert: true})
            ])
            .value()
        )
          .timeout(1000)
          .then(() => { //todo optimise
            _.forEach(res.events, ev => {
              eventEmitter.emit(ev.event, ev.args);
            });

            txService.events.emit('getBlock');
          })
          .catch(err => {
            --currentBlock;
            txService.events.emit('getBlock');
            log.debug(err);
          });
      });

    });

    //register plugins
    _.chain(plugins).values()
      .forEach(plugin => plugin({
        events: eventEmitter,
        contracts_instances: contract_instances,
        eventModels: eventModels,
        contracts: contracts,
        network: network
      }))
      .value();

  });