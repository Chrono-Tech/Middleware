const _ = require('lodash'),
  solidityEvent = require('web3/lib/web3/event.js'),
  config = require('../../../config');


module.exports = async (tx, web3, multiAddress, smEvents) => {

  if (_.get(tx, 'logs', []).length === 0)
    return [];

  return _.chain(tx.logs)
    .filter(log => multiAddress.address === log.address)
    .map(ev => {
      let signatureDefinition = smEvents.signatures[ev.topics[0]];
      if (!signatureDefinition)
        return;

      _.pullAt(ev, 0);
      let resultDecoded = new solidityEvent(null, signatureDefinition).decode(ev);

      return _.chain(resultDecoded)
        .pick(['event', 'args'])
        .merge({args: {controlIndexHash: `${ev.logIndex}:${ev.transactionHash}:${web3.sha3(config.web3.network)}`}})
        .thru(ev => ({
          name: ev.event,
          payload: new smEvents.eventModels[ev.event](_.merge(ev.args, {network: config.web3.network}))
        })
        )
        .value();

    })
    .value();

};