const express = require('express'),
  _ = require('lodash'),
  app = express(),
  collectionRouter = express.Router(),
  bunyan = require('bunyan'),
  log = bunyan.createLogger({name: 'plugins.rest'}),
  q2mb = require('query-to-mongo-and-back');

/**
 * @module rest
 * @description expose event collections via rest api
 * @param ctx - context of app, includes {events: *,
 *    contracts_instances: *,
 *    eventModels: *,
 *    contracts: *}
 */

module.exports = (ctx) => {


  app.get('/', (req, res) => {
    res.send({
      status: 1
    });
  });

  collectionRouter.get('/', (req, res) => {
    res.send(Object.keys(ctx.eventModels));
  });

  _.forEach(ctx.eventModels, (model, name) => {
    collectionRouter.get(`/${name}`, (req, res) => {
      let q = q2mb.fromQuery(req.query);
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

  app.use('/events', collectionRouter);

  app.listen(8080);

};