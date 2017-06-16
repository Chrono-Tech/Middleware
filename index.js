const mongoose = require('mongoose'),
  config = require('./config'),
  blockModel = require('./models').blockModel,
  contractsCtrl = require('./controllers').contractsCtrl,
  eventsCtrl = require('./controllers').eventsCtrl,
  emitter = require('events'),
  _ = require('lodash'),
  plugins = require('./plugins'),
  bunyan = require('bunyan'),
  log = bunyan.createLogger({name: 'app'}),
  Promise = require('bluebird'),
  cluster = require('cluster');

/**
 * @module entry point
 * @description registers all smartContract's events,
 * listen for changes, and notify plugins.
 */

const networks = _.keys(config.web3.networks);
const workers = {};

if (cluster.isMaster) {
  for (let i = 0; i < networks.length; i++) {
    workers[i + 1] = networks[i];
    cluster.fork({network: networks[i]});
  }

  cluster.on('exit', worker => {
    log.error(`worker with pid:${worker.id} is dead`);

    let network = workers[worker.id];
    let new_id = _.chain(workers).keys().size().add(1).value();
    workers[new_id] = network;
    delete workers[worker.id];

    cluster.fork({network: network});

  });

  return;
}

mongoose.connect(config.mongo.uri);

let network = process.env.network;

Promise.all([
  contractsCtrl(config.web3.networks[network]),
  blockModel.findOne({network: network}).sort('-block')

])
  .spread((contracts_ctx, block) => {

    let contracts = contracts_ctx.contracts;
    let contract_instances = contracts_ctx.instances;
    block = _.chain(block).get('block', 0).add(0).value();
    let eventModels = eventsCtrl(contract_instances).eventModels;
    let eventEmitter = new emitter();

    let multi_addr = contract_instances.MultiEventsHistory.address;
    let history_addr = contract_instances.EventsHistory.address;

    log.info(`search from block:${block} for network:${network}`);
    let chain = Promise.resolve();

    _.forEach(contracts, (instance, name) => {

      let events = name === 'ChronoBankPlatformEmitter' ?
        instance.at(history_addr).allEvents({fromBlock: block, toBlock: 'latest'}) :
        instance.at(multi_addr).allEvents({fromBlock: block, toBlock: 'latest'});

      events.watch((error, result) => {

        //console.log(error || result);
        if (!_.has(result, 'event') || !eventModels[result.event] || result.blockNumber <= block) {
          return;
        }

        let new_event = new eventModels[result.event](_.merge(result.args, {network: network}));
        chain = chain.delay(1000).then(() => new_event.save());

        let new_block = new blockModel({block: result.blockNumber, network: network});
        chain = chain.delay(1000).then(() => new_block.save());
        eventEmitter.emit(result.event, result.args);
      });

    });

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

