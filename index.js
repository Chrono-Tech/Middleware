const mongoose = require('mongoose'),
  config = require('./config.json'),
  blockModel = require('./models').blockModel,
  contractsCtrl = require('./controllers').contractsCtrl,
  eventsCtrl = require('./controllers').eventsCtrl,
  emitter = require('events'),
  _ = require('lodash'),
  plugins = require('./plugins'),
  Promise = require('bluebird');

/**
 * @module entry point
 * @description registers all smartContract's events,
 * listen for changes, and notify plugins.
 */


mongoose.connect(config.mongo.uri);

contractsCtrl()
  .then(data =>
    Promise.all([
      {
        eventModels: eventsCtrl(data.instances).eventModels,
        contracts: data,
      },
      blockModel.findOne().sort('-block')
    ])
  )
  .then((data) => {

    let contracts = data[0].contracts.contracts;
    let contract_instances = data[0].contracts.instances;
    let eventModels = data[0].eventModels;
    let block = data[1];

    block = _.chain(block).get('block', 0).add(0).value();
    let addr = contract_instances.MultiEventsHistory.address;
    let eventEmitter = new emitter();

    _.chain(contracts).values()
      .forEach(instance => {
        let events = instance.at(addr).allEvents({fromBlock: block, toBlock: 'latest'});

        events.watch((error, result) => {

          if (!_.has(result, 'event') || !eventModels[result.event] || result.blockNumber <= block) {
            return;
          }
          let new_event = new eventModels[result.event](result.args);
          new_event.save();
          let new_block = new blockModel({block: result.blockNumber});
          new_block.save();
          eventEmitter.emit(result.event, result.args);
        });

      })
      .value();

    // register all plugins
/*
    _.chain(plugins).values()
      .forEach(plugin => plugin(eventEmitter, contracts, eventModels))
      .value();
*/

  });
