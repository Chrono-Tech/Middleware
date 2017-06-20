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
  utilsSolcCoder = require('web3/lib/solidity/coder.js'),
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
  .spread((contracts_ctx, block) => {

    let contracts = contracts_ctx.contracts;
    let contract_instances = contracts_ctx.instances;
    block = _.chain(block).get('block', 0).add(0).value();
    let event_ctx = eventsCtrl(contract_instances, contracts_ctx.web3);
    let eventModels = event_ctx.eventModels;
    let eventSignatures = event_ctx.signatures;
    let eventEmitter = new emitter();

    log.info(`search from block:${block} for network:${network}`);
    let chain = Promise.resolve();

    //chrono has 2 main addresses, from which we receive events, and for each of them we will setup web3.eth.filter
    [contract_instances.MultiEventsHistory.address, contract_instances.EventsHistory.address].forEach(addr => {

      contracts_ctx.web3.eth.filter({fromBlock: block, toBlock: 'latest', address: addr}, (err, result) => {
        //validate that exists, by fetching the first topic and comparing it with our events signatures
        if (!eventSignatures[result.topics[0]] || result.blockNumber <= block) {
          return;
        }

        let signature_definition = eventSignatures[result.topics[0]];
        let args = _.chain(result.topics.slice(1))
          .transform((result, arg, i) => {

            //in case, bytes variable has 0x first - then we cut it, beacuse web3 add 0x automatically
            if (signature_definition.inputs[i].type.match(/^bytes([0-9]{1,})(\[([0-9]*)\])*$/) && arg.indexOf('0x') === 0) {
              arg = arg.slice(2);
            }

            result[signature_definition.inputs[i].name] = utilsSolcCoder.decodeParam(signature_definition.inputs[i].type, arg);
          }, {})
          .value();

        //add new event to mongo
        let new_event = new eventModels[signature_definition.name](_.merge(args, {network: network}));
        chain = chain.delay(100).then(() => new_event.save());

        //add new block to mongo
        let new_block = new blockModel({block: result.blockNumber, network: network});
        chain = chain.delay(100).then(() => new_block.save());
        eventEmitter.emit(signature_definition.name, args);

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

