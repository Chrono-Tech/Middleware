const blockModel = require('../../models').blockModel,
  config = require('../../config'),
  Promise = require('bluebird');

module.exports = (web3) => {
  let chain = Promise.resolve();
  return new Promise(res => {
    let check = () => {
      web3.eth.getBlockNumber((err, result) => {
        chain = chain.delay(10000).then(() =>
          blockModel.findOne({network: config.web3.network})
            .then(block => {
              block.block > result - 10 ?
                res() : check()
            })
        )
      })
    };
    check();
  })
};