const _ = require ('lodash'),
  accountModel = require ('../../../models').accountModel,
  transactionModel = require ('../../../models').transactionModel;

module.exports = async (txs) => {

  let accounts = await accountModel.find ({
    address: {
      $in: _.chain (txs)
        .map (tx => [tx.to, tx.from])
        .flattenDeep ()
        .uniq ()
        .value ()
    }
  });

  accounts = _.map(accounts, account=>account.address);

  return _.chain (txs)
    .filter (tx =>
      (accounts.includes (tx.to) || accounts.includes (tx.from)) && parseInt (tx.value) > 0
    )
    .map (tx => {
      tx.value = parseInt (tx.value);
      tx.blockNumber = parseInt (tx.blockNumber, 16);
      return new transactionModel (tx);
    })
    .value ();

};