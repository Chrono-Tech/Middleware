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
  Promise = require('bluebird');

/**
 * @module entry point
 * @description registers all smartContract's events,
 * listen for changes, and notify plugins.
 */


mongoose.connect(config.mongo.uri);

Promise.all(
  _.map(config.web3.networks, (value, name) =>
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
          blockModel.findOne({network: node.network}).sort('-block')
            .then(block =>
              _.merge(node, {block: block})
            )
        )
        .union([
          eventsCtrl(data[0].contracts.instances).eventModels
        ])
        .value()
    )
  )
  .then(data => {

    let payload = _.chain(data)
      .initial()
      .transform((result, item) => {
        _.set(result, item.network, {
          contracts: item.contracts.instances,
          block: _.chain(item.block).get('block', 0).add(0).value()
        });
      }, {})
      .value();

    let eventModels = _.last(data);
    let eventEmitter = new emitter();
    let contracts = _.chain(data).values().get('0.contracts.contracts').value();

    _.forEach(payload, (data, network) => {

      let local_contracts = _.cloneDeep(contracts);

      let contract_instances = data.contracts;
      let block = data.block;

      let multi_addr = contract_instances.MultiEventsHistory.address;
      let history_addr = contract_instances.EventsHistory.address;

      log.info(`search from block:${block} for network:${network}`);

      _.forEach(local_contracts, (instance, name) => {

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

      });

    });

    // register all plugins
/*
    _.chain(plugins).values()
      .forEach(plugin => plugin({
        events: eventEmitter,
        contracts_instances: payload,
        eventModels: eventModels,
        contracts: contracts
      }))
      .value();
*/

  });