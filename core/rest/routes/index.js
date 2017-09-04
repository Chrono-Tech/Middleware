const _ = require ('lodash'),
  path = require ('path'),
  express = require ('express'),
  requireAll = require ('require-all'),
  routes = requireAll ({
    dirname: path.join (__dirname),
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

module.exports = (app) => {

  app.get ('/', (req, res) => {
    res.send ({
      status: 1
    });
  });

  _.forEach (routes, (route, name) => {
    let router = express.Router ();
    route (router);
    app.use (`/${name.replace ('Route', '')}`, router);
  });

};