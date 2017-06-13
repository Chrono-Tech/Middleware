const mongoose = require('mongoose'),
  config = require('./config'),
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

Promise.all(
  _.map(config.web3.networks, (value, name, i) =>
    contractsCtrl(value)
      .then(contracts => {
        return {
          contracts: contracts,
          network: name
        };
      })
  )
)
  .then(data =>
    Promise.all(
      _.chain(data)
        .map(node =>
          blockModel.findOne().sort('-block')
            .then(block => _.merge(node, {block: block}))
        )
        .union([
          eventsCtrl(data[0].contracts.instances).eventModels
        ])
        .value()
    )
  )
  .then(data => {

    let payload = _.initial(data);//todo transform to contracts inside network i.e. - {development: {LocManager, etc...}}
    let eventModels = _.last(data);
    let eventEmitter = new emitter();

    payload.forEach(item=>{

      let contracts = item.contracts.contracts;
      let contract_instances = item.contracts.instances;
      let block = item.block;
      let network = item.name;

      block = _.chain(block).get('block', 0).add(0).value();
      let multi_addr = contract_instances.MultiEventsHistory.address;
      let history_addr = contract_instances.EventsHistory.address;

      _.chain(contracts)
        .forEach((instance, name) => {

          let events = name === 'ChronoBankPlatformEmitter' ?
            instance.at(history_addr).allEvents({fromBlock: block, toBlock: 'latest'}) :
            instance.at(multi_addr).allEvents({fromBlock: block, toBlock: 'latest'});

          events.watch((error, result) => {

            if (!_.has(result, 'event') || !eventModels[result.event] || result.blockNumber <= block) {
              return;
            }
            let new_event = new eventModels[result.event](_.merge(result.args, {network: network}));
            new_event.save();
            let new_block = new blockModel({block: result.blockNumber, network: network});
            new_block.save();
            eventEmitter.emit(`${result.event}:${network}`, result.args);
          });

        })
        .value();


    });

/*
    // register all plugins
    _.chain(plugins).values()
      .forEach(plugin => plugin(eventEmitter, data[0].contracts, eventModels))
      .value();

*/


  });

/*
return;

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
    let multi_addr = contract_instances.MultiEventsHistory.address;
    let history_addr = contract_instances.EventsHistory.address;
    let eventEmitter = new emitter();

    _.chain(contracts)
      .forEach((instance, name) => {

        let events = name === 'ChronoBankPlatformEmitter' ?
          instance.at(history_addr).allEvents({fromBlock: block, toBlock: 'latest'}) :
          instance.at(multi_addr).allEvents({fromBlock: block, toBlock: 'latest'});

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
    _.chain(plugins).values()
      .forEach(plugin => plugin(eventEmitter, data[0].contracts, eventModels))
      .value();

  });
*/
