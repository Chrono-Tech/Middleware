const _ = require('lodash'),
  bunyan = require('bunyan'),
  config = require('../../../config'),
  Promise = require('bluebird'),
  request = require('request'),
  eventListenerModel = require('../models/eventListenerModel'),
  log = bunyan.createLogger({name: 'plugins.ipfs.scheduleService'});

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
            _.union([
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
                      return eventListenerModel.update({_id: listener}, {$push: {fails: data.controlIndexHash}});
                  })],

              model.find({controlIndexHash: {$in: listener.fails}})
                .then(records =>
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
                      .catch(() => {
                      })
                  )
                )
            )
          )
          .flattenDeep()
          .value()
      )
    )
    /*    .then(results => {
     console.log('done');
     console.log(results);

     })*/
    .catch(err => {
      console.log(err);
    });

};