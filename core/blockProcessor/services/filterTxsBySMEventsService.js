const _ = require('lodash'),
  solidityEvent = require('web3/lib/web3/event.js'),
  config = require('../../../config'),
  path = require('path'),
  contract = require('truffle-contract'),
  requireAll = require('require-all'),
  fs = require('fs');

let contracts = {},
  smEvents = {};

let contractsPath = path.join(__dirname, '../../../node_modules', 'chronobank-smart-contracts/build/contracts');

if (fs.existsSync(contractsPath) && config.smartContracts.events.listen) {
  contracts = requireAll({ //scan dir for all smartContracts, excluding emitters (except ChronoBankPlatformEmitter) and interfaces
    dirname: contractsPath,
    filter: /(^((ChronoBankPlatformEmitter)|(?!(Emitter|Interface)).)*)\.json$/,
    resolve: Contract => contract(Contract)
  });

  smEvents = require('../controllers/eventsCtrl')(contracts);
}

module.exports = async (txs, web3) => {

  if(!_.has(contracts, 'MultiEventsHistory'))
    return [];

  contracts.MultiEventsHistory.setProvider(web3.currentProvider);
  let multiAddress = await contracts.MultiEventsHistory.deployed();

  return _.transform(txs, (result, tx) => {
    if (_.get(tx, 'logs', []).length === 0)
      return;

    _.chain(tx.logs)
      .filter(log => multiAddress.address === log.address)
      .forEach(ev => {
        let signatureDefinition = smEvents.signatures[ev.topics[0]];
        if (!signatureDefinition)
          return;

        _.pullAt(ev, 0);
        let resultDecoded = new solidityEvent(null, signatureDefinition).decode(ev);

        result.push(
          _.chain(resultDecoded)
            .pick(['event', 'args'])
            .merge({args: {controlIndexHash: `${ev.logIndex}:${ev.transactionHash}:${web3.sha3(config.web3.network)}`}})
            .thru(ev => ({
              name: ev.event,
              payload: new smEvents.eventModels[ev.event](_.merge(ev.args, {network: config.web3.network}))
            })
            )
            .value()
        );
      })
      .value();

    return result;
  }, []);

};