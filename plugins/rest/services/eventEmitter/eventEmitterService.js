const _ = require('lodash'),
  bunyan = require('bunyan'),
  Promise = require('bluebird'),
  request = require('request'),
  eventListenerModel = require('../../models/eventListenerModel'),
  ScheduleFailCallback = require('./helpers/ScheduleFailCallback'),
  log = bunyan.createLogger({name: 'plugins.ipfs.scheduleService'}),
  failScheduler = new ScheduleFailCallback();

/**
 * @module scheduleService
 * @description ping ipfs by specified time in config
 * @see {@link ../../../config.json}
 */

module.exports = (ev, model, data) => {

  eventListenerModel.find({event: ev.toLowerCase()})
    .then(listeners =>
      Promise.all(
        _.chain(listeners)
          .filter(listener =>
            _.isEqual(listener.filter, _.pick(data, _.keys(listener.filter)))
          )
          .map(listener =>
              new Promise((resolve, reject) => {
                request(
                  {
                    url: listener.callback,
                    method: 'POST',
                    json: data
                  }, (err, res) => err || res.statusCode !== 200 ?
                    reject() : resolve()
                );
              })
                .catch(() => {
                  if (!listener.fails.includes(data.controlIndexHash))
                    return eventListenerModel.update({_id: listener}, {$push: {fails: data.controlIndexHash}})
                      .then(() => listener._id.toString());
                })
          )
          .value()
      )
    )
    .then(results => {
      results = _.compact(results);
      if (!_.isEmpty(results))
        failScheduler.push(model, results);
    })
    .catch(err => {
      log.error(err);
    });

};