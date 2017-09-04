const blockModel = require('../../models').blockModel,
  config = require('../../config'),
  Promise = require('bluebird');

module.exports = (web3) =>
  new Promise(res => {
    let check = async () => {
      let latestBlock = await Promise.promisify(web3.eth.getBlockNumber)();
      await Promise.delay(10000);
      let currentBlock = await blockModel.findOne({network: config.web3.network});
      currentBlock.block > latestBlock - 10 ?
        res() : check()
    };
    check();
  });