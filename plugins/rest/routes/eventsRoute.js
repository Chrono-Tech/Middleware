const q2mb = require('query-to-mongo-and-back'),
  bunyan = require('bunyan'),
  express = require('express'),
  collectionRouter = express.Router(),
  eventListenerModel = require('../models/eventListenerModel'),
  log = bunyan.createLogger({name: 'plugins.rest.routes.eventRouter'}),
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


module.exports = (app, ctx) => {


  //return all available collections to user
  app.get('/', (req, res) => {
    res.send(Object.keys(ctx.eventModels));
  });

  //register each event in express by its name
  _.forEach(ctx.eventModels, (model, name) => {
    collectionRouter.get(`/${name}`, (req, res) => {
      //convert query request to mongo's
      let q = q2mb.fromQuery(req.query);
      //retrieve all records, which satisfy the query
      model.find(q.criteria, q.options.fields)
        .sort(q.options.sort)
        .limit(q.options.limit)
        .then(result => {
          res.send(result);
        })
        .catch(err => {
          log.error(err);
          res.send([]);
        });
    });
  });

  collectionRouter.post('/listener', (req, res) => {
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

  collectionRouter.delete('/listener', (req, res) => {

    if (!req.body.id)
      return res.send(messages.fail);

    return eventListenerModel.remove({controlIndexHash: req.body.id})
      .then(() => {
        res.send(messages.success);
      })
      .catch(() => res.send(messages.fail));

  });

  //register all events under namespace 'events'
  app.use('/events', collectionRouter);

};