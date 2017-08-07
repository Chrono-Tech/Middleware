const q2mb = require('query-to-mongo-and-back'),
  bunyan = require('bunyan'),
  log = bunyan.createLogger({name: 'plugins.rest.routes.eventRouter'}),
  _ = require('lodash');

/**
 * @function eventsRoute
 * @description register event's routes
 * @param app - express instance
 * @param ctx - context object, exposed from core system to each plugin
 */


module.exports = (ctx, router) => {

  //return all available collections to user
  router.get('/', (req, res) => {
    res.send(Object.keys(ctx.eventModels));
  });

  //register each event in express by its name
  _.forEach(ctx.eventModels, (model, name) => {
    router.get(`/${name}`, (req, res) => {
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

};