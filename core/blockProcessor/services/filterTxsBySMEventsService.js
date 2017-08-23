const _ = require ('lodash'),
  solidityEvent = require ('web3/lib/web3/event.js'),
  config = require ('../../../config'),
  path = require ('path'),
  contract = require ('truffle-contract'),
  require_all = require ('require-all'),
  contracts = require_all ({ //scan dir for all smartContracts, excluding emitters (except ChronoBankPlatformEmitter) and interfaces
    dirname: path.join (__dirname, '../../../node_modules', 'chronobank-smart-contracts/build/contracts'),
    filter: /(^((ChronoBankPlatformEmitter)|(?!(Emitter|Interface)).)*)\.json$/,
    resolve: Contract => contract (Contract)
  }),
  smEvents = require ('../controllers/eventsCtrl') (contracts);

module.exports = async (txs, web3) => {

  contracts.MultiEventsHistory.setProvider (web3.currentProvider);
  let multiAddress = await contracts.MultiEventsHistory.deployed ();

  return _.transform (txs, (result, tx) => {
    if (_.get (tx, 'logs', []).length === 0)
      return;

    _.chain (tx.logs)
      .filter (log => multiAddress.address === log.address)
      .forEach (ev => {
        let signature_definition = smEvents.signatures[ev.topics[0]];
        if (!signature_definition)
          return;

        _.pullAt (ev, 0);
        let result_decoded = new solidityEvent (null, signature_definition).decode (ev);

        result.push (
          _.chain (result_decoded)
            .pick (['event', 'args'])
            .merge ({args: {controlIndexHash: `${ev.logIndex}:${ev.transactionHash}:${web3.sha3 (config.web3.network)}`}})
            .thru (ev => ({
                name: ev.event,
                payload: new smEvents.eventModels[ev.event] (_.merge (ev.args, {network: config.web3.network}))
              })
            )
            .value ()
        );
      })
      .value ();

    return result;
  }, []);

};