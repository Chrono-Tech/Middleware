const mongoose = require('mongoose'),
  config = require('./config'),
  blockModel = require('./models').blockModel,
  accountModel = require('./models').accountModel,
  contractsCtrl = require('./controllers').contractsCtrl,
  eventsCtrl = require('./controllers').eventsCtrl,
  amqpCtrl = require('./controllers').amqpCtrl,
  routes = require('./routes'),
  emitter = require('events'),
  express = require('express'),
  cors = require('cors'),
  bodyParser = require('body-parser'),
  _ = require('lodash'),
  plugins = require('./plugins'),
  bunyan = require('bunyan'),
  log = bunyan.createLogger({name: 'app'}),
  Promise = require('bluebird'),
  listenTxsFromBlockIPCService = require('./services/listenTxsFromBlockIPCService'),
  blockProcessService = require('./services/blockProcessService'),
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
  accountModel.find({}),
  amqpCtrl()
])
  .spread((contracts_ctx, currentBlock, accounts, amqpEmitter) => {

    if (!_.has(contracts_ctx, 'instances.MultiEventsHistory.address')/* || !_.has(contracts_ctx, 'instances.EventsHistory.address')*/) {
      log.info(`contracts haven't been deployed to network - ${network}`);
      log.info('restart process in one hour...');
      return setTimeout(() => process.exit(1), 3600 * 1000);
    }

    accounts = _.map(accounts, a => a.address);
    let contracts = contracts_ctx.contracts;
    let contract_instances = contracts_ctx.instances;
    currentBlock = _.chain(currentBlock).get('block', 0).add(0).value();
    let event_ctx = eventsCtrl(contracts);
    let eventEmitter = new emitter();
    let app = express();

    log.info(`search from block:${currentBlock} for network:${network}`);
    let txService = listenTxsFromBlockIPCService(network);

    let process = () => {
      return blockProcessService(txService, currentBlock, contract_instances, event_ctx, eventEmitter, accounts, network)
        .then(() => {
          currentBlock++;
          process();
        })
        .catch(err => {
          if ([1, 2, 11000].includes(_.get(err, 'code')))
            currentBlock++;

          if (_.get(err, 'code') === 0)
            log.info(`await for next block ${currentBlock}`);

          if (_.get(err, 'code') === 1)
            log.info(`found a broken block ${currentBlock - 1}`);

          _.get(err, 'code') === 0 ?
            setTimeout(process, 10000) :
            process();
        });
    };

    txService.events.on('connected', process);

    let ctx = {
      events: eventEmitter,
      contracts_instances: contract_instances,
      eventModels: event_ctx.eventModels,
      contracts: contracts,
      network: network,
      users: accounts,
      amqpEmitter: amqpEmitter,
      express: app
    };

    app.use(cors());
    app.use(bodyParser.urlencoded({extended: false}));
    app.use(bodyParser.json());

    routes(ctx);

    app.listen(config.rest.port || 8080);

//register plugins

    _.chain(plugins).values()
      .forEach(plugin => plugin(ctx))
      .value();

  });