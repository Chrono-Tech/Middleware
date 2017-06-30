const blockModel = require('../../models').blockModel,
  Promise = require('bluebird');

module.exports = (ctx) => {
  let chain = Promise.resolve();
  return new Promise(res => {
    let check = () => {
      ctx.web3.eth.getBlockNumber((err, result) => {
        chain = chain.delay(10000).then(() =>
          blockModel.findOne({network: 'development'})
            .then(block => {
              block.block - 1 === result ?
                res() : check()
            })
        )
      })
    };
    check();
  })
};