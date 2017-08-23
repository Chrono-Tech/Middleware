const mongoose = require('mongoose'),
  config = require('./config'),
  blockModel = require('./models').blockModel,
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


mongoose.connect(config.mongo.uri);

//we expose network name to webworker from muster node

//init contracts on the following network and fetch the latest block for this network from mongo

Promise.all([
  contractsCtrl(config.web3.network),
  blockModel.findOne({network: config.web3.network}).sort('-block'),
  amqpCtrl()
])
  .spread((contracts_ctx, currentBlock, amqpInstance) => {

    if (!_.has(contracts_ctx, 'instances.MultiEventsHistory.address')) {
      log.info(`contracts haven't been deployed to network - ${config.web3.network}`);
      log.info('restart process in one hour...');
      return setTimeout(() => process.exit(1), 3600 * 1000);
    }

    let contracts = contracts_ctx.contracts;
    let contract_instances = contracts_ctx.instances;
    currentBlock = _.chain(currentBlock).get('block', 0).add(0).value();
    let event_ctx = eventsCtrl(contracts);
    let eventEmitter = new emitter();

    log.info(`search from block:${currentBlock} for network:${config.web3.network}`);
    let txService = listenTxsFromBlockIPCService(config.web3.network);

    let process = () => {
      return blockProcessService(txService, currentBlock, contract_instances, event_ctx, eventEmitter)
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

/*    let ctx = {
      events: eventEmitter,
      contracts_instances: contract_instances,
      eventModels: event_ctx.eventModels,
      contracts: contracts,
      amqpInstance: amqpInstance,
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
      .value();*/

  });