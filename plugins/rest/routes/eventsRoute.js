const q2mb = require('query-to-mongo-and-back'),
  bunyan = require('bunyan'),
  express = require('express'),
  collectionRouter = express.Router(),
  eventListenerModel = require('../models/eventListenerModel'),
  eventEmitterService = require('../services/eventEmitterService'),
  log = bunyan.createLogger({name: 'plugins.rest.routes.eventRouter'}),
  messages = require('../../../factories').messages.genericMessageFactory,
  _ = require('lodash');

module.exports = (app, ctx) => {


  //return all available collections to user
  app.get('/', (req, res) => {
    res.send(Object.keys(ctx.eventModels));
  });

  //register each event in express by its name
  _.forEach(ctx.eventModels, (model, name) => {
    app.get(`/${name}`, (req, res) => {
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
    let eventListener = new eventListenerModel(req.body);
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

  //register all events under namespace 'events'
  app.use('/events', collectionRouter);

  _.chain(ctx.eventModels)
    .keys()
    .forEach(event=>{
      ctx.events.on(event, data=>{
        eventEmitterService(event, ctx.eventModels[event], data);
      });
    })
    .value();

};