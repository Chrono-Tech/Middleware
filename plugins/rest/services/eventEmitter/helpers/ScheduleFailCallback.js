const schedule = require('node-schedule'),
  _ = require('lodash'),
  bunyan = require('bunyan'),
  Promise = require('bluebird'),
  eventListenerModel = require('../../../models/eventListenerModel'),
  request = require('request'),
  log = bunyan.createLogger({name: 'plugins.rest.services.eventEmitter.helpers.ScheduleFailCallback'});

/**
 * @module scheduleService
 * @description ping ipfs by specified time in config
 * @see {@link ../../../config.json}
 */

module.exports = class ScheduleFailCallback {

  constructor() {
    this.fails = {};
  }

  push(model, fails) {

    let modelName = model.modelName.toLowerCase();

    !this.fails[modelName] ?
      this.fails[modelName] = {model, fails} :
      this.fails[modelName].fails = _.chain(this.fails[modelName].fails)
        .union(fails)
        .uniq()
        .value();

    if (!this.scheduler)
      this.start();

  }

  start() {

    log.info('starting failListener schedule');
    let rule = new schedule.RecurrenceRule();
    rule.second = 30;

    this.scheduler = schedule.scheduleJob(rule, () => {

      eventListenerModel.find({
        _id: {
          $in: _.chain(this.fails)
            .map(f => f.fails)
            .flattenDeep()
            .uniq()
            .value()
        },
        fails: {$not: {$size: 0}}
      })
        .then(listeners => {
          return Promise.all(
            _.chain(listeners)
              .map(listener =>
                this.fails[listener.event].model
                  .find({controlIndexHash: {$in: listener.fails}})
                  .then(records =>
                    Promise.all(
                      _.map(records, record =>
                        new Promise((resolve, reject) => {
                          request(
                            {
                              url: listener.callback,
                              method: 'POST',
                              json: _.omit(record, '_id')
                            }, (err, res) => err || res.statusCode !== 200 ?
                              reject() : resolve()
                          );
                        })
                          .then(() =>
                            eventListenerModel.update({_id: listener}, {$pull: {fails: record.controlIndexHash}})
                          )
                          .catch(() => ({status: 0}))
                      )
                    )
                  )
              )
              .flattenDeep()
              .value()
          );
        })
        .then(result => {
          if (_.chain(result)
              .flattenDeep()
              .filter({status: 0})
              .isEmpty()
              .value()) {
            this.scheduler.cancel();
            delete this.scheduler;
          }
        });
    });
  }
};