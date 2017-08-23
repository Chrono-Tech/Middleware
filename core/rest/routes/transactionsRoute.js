const transactionModel = require('../../../models').transactionModel,
  accountModel = require('../../../models').accountModel,
  messages = require('../../../factories').messages.genericMessageFactory,
  q2mb = require('query-to-mongo-and-back');

/**
 * @function transactionsRoute
 * @description register transaction's route
 * @param app - express instance
 */

module.exports = async(router) => {

  router.get('/', async(req, res) => {
    //convert query request to mongo's
    let q = q2mb.fromQuery(req.query);
    //retrieve all records, which satisfy the query
    let result = await transactionModel.find(q.criteria, q.options.fields)
      .sort(q.options.sort)
      .limit(q.options.limit)
      .catch(() => []);

    res.send(result);

  });

  router.post('/account', async(req, res) => {
    let account = new accountModel(req.body);
    if (account.validateSync())
      return res.send(messages.fail);

    try {
      await account.save();
    } catch (e) {
      return res.send(messages.fail);
    }
    res.send(messages.success);

  });

  router.get('/accounts', async(req, res) => {
    //convert query request to mongo's
    let q = q2mb.fromQuery(req.query);
    //retrieve all records, which satisfy the query
    let result = await accountModel.find(q.criteria, q.options.fields)
      .sort(q.options.sort)
      .limit(q.options.limit)
      .catch(() => []);

    res.send(result);

  });

  router.delete('/account', async(req, res) => {

    if (!req.body.address)
      return res.send(messages.fail);

    try {
      await accountModel.remove({address: req.body.address});
    } catch (e) {
      return res.send(messages.fail);
    }
    res.send(messages.success);

  });

};