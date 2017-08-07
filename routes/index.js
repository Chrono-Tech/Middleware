const _ = require('lodash'),
  path = require('path'),
  express = require('express'),
  require_all = require('require-all'),
  routes = require_all({
    dirname: path.join(__dirname),
    filter: /(.+Route)\.js$/
  });

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

  ctx.express.get('/', (req, res) => {
    res.send({
      status: 1
    });
  });

  _.forEach(routes, (route, name) => {
    let router = express.Router();
    route(ctx, router);
    ctx.express.use(`/${name.replace('Route', '')}`, router);

  });


};