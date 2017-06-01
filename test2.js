const config = require('./config.json'),
  Web3 = require('web3'),
  web3 = new Web3(),
  contract = require("truffle-contract"),
  _ = require('lodash'),
  Promise = require('bluebird'),
  provider = new Web3.providers.HttpProvider(config.web3.url),
  ChronoBankPlatformEmitter_definition = require("./SmartContracts/build/contracts/ChronoBankPlatformEmitter"),
  ChronoBankPlatform_definition = require("./SmartContracts/build/contracts/ChronoBankPlatform"),
  chronoMintEmitter_definition = require("./SmartContracts/build/contracts/ChronoMintEmitter"),
  chronoMint_definition = require("./SmartContracts/build/contracts/ChronoMint"),
  EventsHistory_definition = require("./SmartContracts/build/contracts/EventsHistory"),
  userManager_definition = require("./SmartContracts/build/contracts/UserManager");

web3.setProvider(provider);

let chronoBankPlatform = contract(ChronoBankPlatform_definition);
let ChronoBankPlatformEmitter = contract(ChronoBankPlatformEmitter_definition);
let chronoMintEmitter = contract(chronoMintEmitter_definition);
let EventsHistory = contract(EventsHistory_definition);
let chronoMint = contract(chronoMint_definition);
let userManager = contract(userManager_definition);

[chronoBankPlatform, ChronoBankPlatformEmitter, chronoMintEmitter, EventsHistory, chronoMint, userManager]
  .forEach(c => {
    c.defaults({from: web3.eth.coinbase, gas: 3000000});
    c.setProvider(provider);
  });

Promise.all([
  EventsHistory.deployed(),
  chronoMintEmitter.deployed(),
  chronoBankPlatform.deployed(),
  chronoMint.deployed(),
  userManager.deployed()
])
  .spread((EventsHistory, chronoMintEmitter, chronoBankPlatform, chronoMint, userManager) => {
    return Promise.all([
      chronoBankPlatform.setupEventsHistory(EventsHistory.address, {gas: 3000000}),
      chronoMint.setupEventsHistory(EventsHistory.address, {gas: 3000000}),
      userManager.setupEventsHistory(EventsHistory.address, {gas: 3000000}),
      ChronoBankPlatformEmitter.at(EventsHistory.address)
    ])
  })
  .then((data) => {
    let instance = _.last(data);

    let events = instance.allEvents({fromBlock: 0});

    console.log('listen');
    events.watch((err, result) => {
      console.log(err || result)
    })

  });
/*

 Promise.all([
 EventsHistory.deployed(),
 ChronoBankPlatform.deployed()
 ])
 .spread((EventsHistory, ChronoBankPlatform) => {

 return Promise.all([
 EventsHistory.addVersion(ChronoBankPlatform.address, "Origin", "Initial version.", {gas: 3000000}),
 chronoMintEmitter.at(EventsHistory.address)
 ])
 })
 .then(data => {

 let instance = _.last(data);

 let events = instance.allEvents({fromBlock: 0});

 console.log('listen');
 events.watch((err, result) => {
 console.log(err || result)
 })

 console.log('emit');
 /!*
 instance.Recovery(
 '0xa7b26a8d0293b5be6cd630d16584c1c18ec0157f',
 // '0xa7b26a8d0293b5be6cd630d16584c1c18ec0157a',
 '0xa7b26a8d0293b5be6cd630d16584c1c18ec0157b', 1);
 *!/

 instance.newLOC("name");

 });

 */
