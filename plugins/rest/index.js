const express = require('express'),
  _ = require('lodash'),
  app = express(),
  cors = require('cors'),
  bodyParser = require('body-parser'),
  path = require('path'),
  require_all = require('require-all'),
  routes = require_all({
    dirname: path.join(__dirname, 'routes'),
    filter: /(.+Route)\.js$/
  }),
  config = require('../../config');

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

  _.forEach(routes, r=> r(app, ctx));

  app.listen(config.rest.port || 8080);

};