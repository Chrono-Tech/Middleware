const bunyan = require('bunyan'),
  transactionModel = require('../../../models').transactionModel,
  log = bunyan.createLogger({name: 'plugins.rest.routes.transactionsRoute'}),
  q2mb = require('query-to-mongo-and-back');


module.exports = (app)=>{

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

};