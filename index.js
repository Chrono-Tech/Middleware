const mongoose = require('mongoose'),
  config = require('./config.json'),
  blockModel = require('./models').blockModel,
  contractsCtrl = require('./controllers').contractsCtrl(),
  emitter = require('events'),
  _ = require('lodash'),
  plugins = require('./plugins'),
  Promise = require('bluebird');

mongoose.connect(config.mongo.uri);

Promise.all([
  contractsCtrl.initEmitter,
  blockModel.findOne().sort('-block')
]).spread((instance, block) => {

  block = _.chain(block).get('block', 0).add(0).value();
  let eventEmitter = new emitter();

  let events = instance.allEvents({fromBlock: block, toBlock: 'latest'});

  events.watch((error, result) => {
    console.log(result);
    if (!_.has(result, 'event') || !contractsCtrl.eventModels[result.event] || result.blockNumber <= block) {
      return;
    }
    let new_event = new contractsCtrl.eventModels[result.event](result.args);
    new_event.save();
    let new_block = new blockModel({block: result.blockNumber});
    new_block.save();
    eventEmitter.emit(result.event, result.args);
  });

  plugins.ipfs(eventEmitter);

});