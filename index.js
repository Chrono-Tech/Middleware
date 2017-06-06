const mongoose = require('mongoose'),
  config = require('./config.json'),
  blockModel = require('./models').blockModel,
  contractsCtrl = require('./controllers').contractsCtrl(),
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

Promise.all([
  contractsCtrl.initEmitter,
  contractsCtrl.contracts,
  blockModel.findOne().sort('-block')
]).spread((components, contracts, block) => {

  block = _.chain(block).get('block', 0).add(0).value();
  let eventEmitter = new emitter();

  /** initialize eventEmitter and watcher for eth contracts **/
  _.chain(components).values()
    .forEach(instance => {
      let events = instance.allEvents({fromBlock: block, toBlock: 'latest'});

      events.watch((error, result) => {
        if (!_.has(result, 'event') || !contractsCtrl.eventModels[result.event] || result.blockNumber <= block) {
          return;
        }
        let new_event = new contractsCtrl.eventModels[result.event](result.args);
        new_event.save();
        let new_block = new blockModel({block: result.blockNumber});
        new_block.save();
        eventEmitter.emit(result.event, result.args);
      });

    })
    .value();

  /** register all plugins **/
  _.chain(plugins).values()
    .forEach(plugin=> plugin(eventEmitter, contracts))
    .value();

});