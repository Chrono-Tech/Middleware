const ipfsAPI = require('ipfs-api'),
  config = require('./config.json'),
  Web3 = require('web3'),
  Event_definition = require('./SmartContracts/build/contracts/Events.json'),
  web3 = new Web3(),
  contract = require("truffle-contract"),
  _ = require('lodash'),
  provider = new Web3.providers.HttpProvider(config.web3.url);

const ipfs_stack = config.nodes.map(node => ipfsAPI(node));

const Event = contract(Event_definition);

web3.setProvider(provider);

Event.defaults({from: web3.eth.coinbase});
Event.setProvider(provider);

const obj = {
  Data: new Buffer(Math.random().toString(36)),
  Links: []
};

Promise.all(
  _.chain(ipfs_stack)
    .map(ipfs =>
      ipfs.object.put(obj)
    )
    .union([Event.deployed()])
    .value()
)
  .then(data => {
    let items = _.initial(data).map(item => item.toJSON().multihash);
    let event_instance = _.last(data);
    console.log(items);

      event_instance.addAddress(items[0], {gas: 3000000});

      setTimeout(()=>{
         event_instance.updateAddress(items[0], items[0], {gas: 3000000})
      }, 2000);


  });