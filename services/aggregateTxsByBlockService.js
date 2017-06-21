const _ = require('lodash'),
  solidityEvent = require('web3/lib/web3/event.js');

module.exports = (ctx, eventSignatures, platform_addresses, users, web3, block) => {

  return new Promise(res =>
    web3.eth.getBlock(block, (err, result) => res(result))
  )
    .then(block => {
      return Promise.all(
        _.map(block.transactions, tx =>
          new Promise(res =>
            //web3.eth.getTransaction(tx, (err, result) => res(result)) //todo connect for filtering right txs
            web3.eth.getTransactionReceipt(tx, (err, result) => res(result))
          )
        )
      );
    })
    .then(txs => {

      return _.chain(txs)
        .transform((result, tx) => {

          if (tx.logs.length > 0) {
            _.chain(tx.logs)
              .filter(log => platform_addresses.includes(log.address))
              .forEach(ev => {
                let signature_definition = eventSignatures[ev.topics[0]];
                let result_decoded = new solidityEvent(null, signature_definition).decode(ev);
                result.events.push(_.pick(result_decoded, ['event', 'args']));
              })
              .value();

          }

          console.log(tx)
          if (users.includes(tx.to) && parseInt(tx.value) > 0) {
            tx.value = parseInt(tx.value);
            tx.gasPrice = parseInt(tx.gasPrice);
            result.txs.push(tx);
          }

        }, {events: [], txs: []})
        .value();

    });

};