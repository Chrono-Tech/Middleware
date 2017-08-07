const eventListenerModel = require('../models/eventListenerModel'),
  messages = require('../../../factories').messages.genericMessageFactory,
  Web3 = require('web3'),
  web3 = new Web3(),
  _ = require('lodash');

/**
 * @function eventsRoute
 * @description register event's routes
 * @param app - express instance
 * @param ctx - context object, exposed from core system to each plugin
 */


module.exports = (ctx, router) => {

  router.post('/', (req, res) => {
    let eventListener = new eventListenerModel(
      _.merge(req.body, {controlIndexHash: `${web3.sha3(req.body.event)}:${web3.sha3(JSON.stringify(req.body.filter))}`}));
    let error = eventListener.validateSync();

    if (error) {
      return res.send(
        _.chain(error)
          .get('errors', {})
          .toPairs()
          .get('0.1.properties', messages.fail)
          .pick(['success', 'message'])
          .value()
      );
    }

    return eventListener.save()
      .then(() => {
        res.send(messages.success);
      })
      .catch(() => res.send(messages.fail));

  });

  router.delete('/', (req, res) => {

    if (!req.body.id)
      return res.send(messages.fail);

    return eventListenerModel.remove({controlIndexHash: req.body.id})
      .then(() => {
        res.send(messages.success);
      })
      .catch(() => res.send(messages.fail));

  });

};