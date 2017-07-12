const express = require('express'),
  _ = require('lodash'),
  app = express(),
  cors = require('cors'),
  bodyParser = require('body-parser'),
  collectionRouter = express.Router(),
  bunyan = require('bunyan'),
  config = require('../../config'),
  generateSwagger = require('./generateSwagger'),
  accountModel = require('../../models').accountModel,
  transactionModel = require('../../models').transactionModel,
  messages = require('../../factories').messages.genericMessageFactory,
  log = bunyan.createLogger({name: 'plugins.rest'}),
  q2mb = require('query-to-mongo-and-back');

/**
 * @module rest
 * @description expose event collections via rest api
 * @param ctx - context of app, includes {
 *    events: *,
 *    contracts_instances: *,
 *    eventModels: *,
 *    contracts: *
 *    network: *
 *    }
 */

module.exports = (ctx) => {

  app.use(cors());
  app.use(bodyParser.urlencoded({extended: false}));
  app.use(bodyParser.json());

  app.get('/', (req, res) => {
    res.send({
      status: 1
    });
  });

  app.get('/swagger', (req, res) => {
    res.send(generateSwagger.definition);
  });

  app.get('/transactions', (req, res) => {
    //convert query request to mongo's
    let q = q2mb.fromQuery(req.query);
    //retrieve all records, which satisfy the query
    transactionModel.find(q.criteria, q.options.fields)
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

  app.post('/account', (req, res) => {
    let account = new accountModel(req.body);
    let error = account.validateSync();

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

    return account.save()
      .then(() => {
        ctx.users.push(account.address);
        res.send(messages.success);
      })
      .catch(() => res.send(messages.fail));

  });

  //return all available collections to user
  collectionRouter.get('/', (req, res) => {
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

  //register all events under namespace 'events'
  app.use('/events', collectionRouter);

  app.listen(config.rest.port || 8080);

};