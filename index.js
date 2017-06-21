const mongoose = require('mongoose'),
  config = require('./config'),
  blockModel = require('./models').blockModel,
  contractsCtrl = require('./controllers').contractsCtrl,
  eventsCtrl = require('./controllers').eventsCtrl,
  aggregateTxsByBlockService = require('./services/aggregateTxsByBlockService'),
  emitter = require('events'),
  _ = require('lodash'),
  plugins = require('./plugins'),
  bunyan = require('bunyan'),
  log = bunyan.createLogger({name: 'app'}),
  Promise = require('bluebird'),
  solidityEvent = require('web3/lib/web3/event.js'),
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
    let new_id = _.chain(workers).keys().size().add(1).value();
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
    let event_ctx = eventsCtrl(contract_instances, contracts_ctx.web3);
    let eventModels = event_ctx.eventModels;
    let eventEmitter = new emitter();

    log.info(`search from block:${currentBlock} for network:${network}`);
    let chain = Promise.resolve();
    let step = 50;

    let check = () => {
      console.log('inside with block: ', currentBlock);
      return new Promise(res =>
        contracts_ctx.web3.eth.getBlockNumber((err, result) => res(result))
      )
        .then(maxBlock =>
          currentBlock === maxBlock ? Promise.resolve([]) :
            Promise.map(new Array(maxBlock < currentBlock + step ? maxBlock - currentBlock : currentBlock + step), () =>
              aggregateTxsByBlockService(contracts_ctx, contracts_ctx.web3.eth.accounts, contracts_ctx.web3, ++currentBlock)
            )
        )
        .then(data => {

          if(_.isEmpty(data)){
            chain = chain.delay(2000).then(() => check());
            return;
          }

           _.chain(data)
            .map(d=>d.events)
            .flattenDeep()
            .forEach(ev=>{
              console.log(ev);
              if(!eventModels[ev.event]){
                return;
              }

              console.log(ev)

              let new_event = new eventModels[ev.event](_.merge(ev.args, {network: network}));
              chain = chain.delay(100).then(() => new_event.save());
              eventEmitter.emit(ev.event, ev.args);
            })
            .value();

           //todo record table with tx

          //add new block to mongo
          let new_block = new blockModel({block: currentBlock, network: network});
          chain = chain.delay(100).then(() => new_block.save());


          console.log('chunk length:', data.length);
          //console.log(_.filter(data, item => item.events.length > 0 || item.txs.length > 0));
          chain = chain.delay(2000).then(() => check());
        });
    };
    chain = chain.then(() => check());














/*
    //chrono has 2 main addresses, from which we receive events, and for each of them we will setup web3.eth.filter
    [contract_instances.MultiEventsHistory.address, contract_instances.EventsHistory.address].forEach(addr => {

      contracts_ctx.web3.eth.filter({fromBlock: block, toBlock: 'latest', address: addr}, (err, result) => {
        //validate that exists, by fetching the first topic and comparing it with our events signatures
        if (!eventSignatures[result.topics[0]] || result.blockNumber <= block) {
          return;
        }

        let signature_definition = eventSignatures[result.topics[0]];
        let result_decoded = new solidityEvent(null, signature_definition).decode(result);

        //add new event to mongo
        let new_event = new eventModels[result_decoded.event](_.merge(result_decoded.args, {network: network}));
        chain = chain.delay(100).then(() => new_event.save());

        //add new block to mongo
        let new_block = new blockModel({block: result.blockNumber, network: network});
        chain = chain.delay(100).then(() => new_block.save());
        eventEmitter.emit(signature_definition.name, result_decoded.args);

      });
    });
*/

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

