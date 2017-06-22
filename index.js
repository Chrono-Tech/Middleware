const mongoose = require('mongoose'),
  config = require('./config'),
  blockModel = require('./models').blockModel,
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
  blockModel.findOne({network: network}).sort('-block')

])
  .spread((contracts_ctx, currentBlock) => {

    let contracts = contracts_ctx.contracts;
    let contract_instances = contracts_ctx.instances;
    currentBlock = _.chain(currentBlock).get('block', 0).add(0).value();
    let latestBlock = 0;
    let event_ctx = eventsCtrl(contract_instances, contracts_ctx.web3);
    let eventModels = event_ctx.eventModels;
    let eventEmitter = new emitter();

    log.info(`search from block:${currentBlock} for network:${network}`);
    let txService = listenTxsFromBlockIPCService();

    let accounts = contracts_ctx.web3.eth.accounts;
    txService.events.on('connected', () => {

      txService.events.emit('getBlock');
      txService.events.on('block', block => {
        latestBlock = block;
        txService.events.emit('getTx', ++currentBlock);
      });

      txService.events.on('tx', (tx) => {
        if (!tx) {
          return currentBlock >= latestBlock ?
            setTimeout(() => {
              txService.events.emit('getTx', currentBlock);
            }, 60000) : txService.events.emit('getTx', ++currentBlock);
        }



        let res = aggregateTxsByBlockService(tx,
          [contract_instances.MultiEventsHistory.address, contract_instances.EventsHistory.address],
          event_ctx.signatures,
          accounts
        );


/*        if(res.txs.length)
        console.log(res)*/

        Promise.all(
          _.chain(res.events)
            .map(ev => new eventModels[ev.event](_.merge(ev.args, {network: network})).save())
            .union([
              transactionModel.insertMany(res.txs),
              blockModel.findOneAndUpdate({network: network}, {
                block: currentBlock,
                created: Date.now()
              }, {upsert: true})
            ])
            .value()
        )
          .then(() => { //todo optimise
            txService.events.emit('getTx', ++currentBlock);
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

