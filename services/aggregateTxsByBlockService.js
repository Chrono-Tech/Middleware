const _ = require('lodash'),
  solidityEvent = require('web3/lib/web3/event.js'),
  Web3 = require('web3'),
  config = require('../config'),
  web3 = new Web3();

module.exports = (txs, event_addresses, eventSignatures, users) => {

  return _.transform(txs, (result, tx) => {

    if (_.get(tx, 'logs', []).length > 0) {
      _.chain(tx.logs)
        .filter(log => event_addresses.includes(log.address))
        .forEach(ev => {
          let signature_definition = eventSignatures[ev.topics[0]];
          if (!signature_definition)
            return;

          _.pullAt(ev, 0);
          let result_decoded = new solidityEvent(null, signature_definition).decode(ev);

          result.events.push(
            _.chain(result_decoded)
              .pick(['event', 'args'])
              .merge({args: {controlIndexHash: `${ev.logIndex}:${ev.transactionHash}:${web3.sha3(config.web3.network)}`}})
              .value()
          );
        })
        .value();

    }

    if ((users.includes(tx.to) || users.includes(tx.from)) && parseInt(tx.value) > 0) {
      tx.value = parseInt(tx.value);
      tx.blockNumber = parseInt(tx.blockNumber, 16);
      result.txs.push(tx);
    }

    return result;
  }, {events: [], txs: []});

};