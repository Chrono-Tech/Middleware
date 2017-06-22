const _ = require('lodash'),
  solidityEvent = require('web3/lib/web3/event.js');

module.exports = (tx, event_addresses, eventSignatures, users) => {

  const result = {
    events: [],
    txs: []
  };

  if (tx.logs.length > 0) {
    _.chain(tx.logs)
      .filter(log => event_addresses.includes(log.address))
      .forEach(ev => {
        let signature_definition = eventSignatures[ev.topics[0]];
        if (!signature_definition)
          return;

        //console.log(ev)
        let result_decoded = new solidityEvent(null, signature_definition).decode(ev);
        result.events.push(_.pick(result_decoded, ['event', 'args']));
      })
      .value();

  }

  /*  if(tx.value)
   console.log(parseInt(tx.value))*/
  //if ((users.includes(tx.to) || users.includes(tx.from)) && parseInt(tx.value) > 0) {
  if (parseInt(tx.value) > 0) {
    tx.value = parseInt(tx.value);
    tx.blockNumber = parseInt(tx.blockNumber, 16);
    result.txs.push(tx);
  }

  return result;

};