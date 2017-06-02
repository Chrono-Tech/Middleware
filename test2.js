const config = require('./config.json'),
  Web3 = require('web3'),
  web3 = new Web3(),
  contract = require("truffle-contract"),
  _ = require('lodash'),
  Promise = require('bluebird'),
  provider = new Web3.providers.HttpProvider(config.web3.url),
  helpers = require('./helpers'),
  chronoBankPlatformEmitter_definition = require("./SmartContracts/build/contracts/ChronoBankPlatformEmitter"),
  chronoBankPlatform_definition = require("./SmartContracts/build/contracts/ChronoBankPlatform"),
  chronoMintEmitter_definition = require("./SmartContracts/build/contracts/ChronoMintEmitter"),
  chronoMint_definition = require("./SmartContracts/build/contracts/ChronoMint"),
  eventsHistory_definition = require("./SmartContracts/build/contracts/EventsHistory"),
  userManager_definition = require("./SmartContracts/build/contracts/UserManager");

const fakeArgs = [0, 0, 0, 0, 0, 0, 0, 0];

web3.setProvider(provider);

let chronoBankPlatform = contract(chronoBankPlatform_definition);
let chronoBankPlatformEmitter = contract(chronoBankPlatformEmitter_definition);
let chronoMintEmitter = contract(chronoMintEmitter_definition);
let eventsHistory = contract(eventsHistory_definition);
let chronoMint = contract(chronoMint_definition);
let userManager = contract(userManager_definition);

[chronoBankPlatform, chronoBankPlatformEmitter, chronoMintEmitter, eventsHistory, chronoMint, userManager]
  .forEach(c => {
    c.defaults({from: web3.eth.coinbase, gas: 3000000});
    c.setProvider(provider);
  });

Promise.all([
  eventsHistory.deployed(),
  chronoMintEmitter.deployed(),
  chronoBankPlatformEmitter.deployed(),
  chronoBankPlatform.deployed(),
  chronoMint.deployed(),
  userManager.deployed()
])
  .spread((EventsHistory, ChronoMintEmitter, ChronoBankPlatformEmitter, ChronoBankPlatform, ChronoMint, UserManager) => {

    return Promise.all([
      ChronoMint,
      ChronoBankPlatform.setupEventsHistory(EventsHistory.address, {gas: 3000000}),
      ChronoMint.setupEventsHistory(EventsHistory.address, {gas: 3000000}),
      UserManager.setupEventsHistory(EventsHistory.address, {gas: 3000000}),
      EventsHistory.addEmitter(ChronoMintEmitter.contract.newLOC.getData.apply(this, fakeArgs).slice(0, 10), ChronoMintEmitter.address, {gas: 3000000}),
      EventsHistory.addEmitter(ChronoMintEmitter.contract.hashUpdate.getData.apply(this, fakeArgs).slice(0, 10), ChronoMintEmitter.address, {gas: 3000000}),
      EventsHistory.addEmitter(ChronoMintEmitter.contract.cbeUpdate.getData.apply(this, fakeArgs).slice(0, 10), ChronoMintEmitter.address, {gas: 3000000}),
      EventsHistory.addEmitter(ChronoMintEmitter.contract.cbeUpdate.getData.apply(this, fakeArgs).slice(0, 10), ChronoMintEmitter.address, {gas: 3000000}),
      EventsHistory.addEmitter(ChronoBankPlatformEmitter.contract.emitTransfer.getData.apply(this, fakeArgs).slice(0, 10), ChronoBankPlatformEmitter.address, {gas: 3000000}),
      EventsHistory.addEmitter(ChronoBankPlatformEmitter.contract.emitIssue.getData.apply(this, fakeArgs).slice(0, 10), ChronoBankPlatformEmitter.address, {gas: 3000000}),
      EventsHistory.addEmitter(ChronoBankPlatformEmitter.contract.emitRevoke.getData.apply(this, fakeArgs).slice(0, 10), ChronoBankPlatformEmitter.address, {gas: 3000000}),
      EventsHistory.addEmitter(ChronoBankPlatformEmitter.contract.emitOwnershipChange.getData.apply(this, fakeArgs).slice(0, 10), ChronoBankPlatformEmitter.address, {gas: 3000000}),
      EventsHistory.addEmitter(ChronoBankPlatformEmitter.contract.emitApprove.getData.apply(this, fakeArgs).slice(0, 10), ChronoBankPlatformEmitter.address, {gas: 3000000}),
      EventsHistory.addEmitter(ChronoBankPlatformEmitter.contract.emitRecovery.getData.apply(this, fakeArgs).slice(0, 10), ChronoBankPlatformEmitter.address, {gas: 3000000}),
      EventsHistory.addEmitter(ChronoBankPlatformEmitter.contract.emitError.getData.apply(this, fakeArgs).slice(0, 10), ChronoBankPlatformEmitter.address, {gas: 3000000}),
      EventsHistory.addVersion(ChronoBankPlatform.address, "Origin", "Initial version."),
      EventsHistory.addVersion(ChronoMint.address, "Origin", "Initial version."),
      EventsHistory.addVersion(UserManager.address, "Origin", "Initial version."),
      chronoBankPlatformEmitter.at(EventsHistory.address),
      chronoMintEmitter.at(EventsHistory.address)
    ])
  })
  .then((data) => {

    let chronoBankPlatformEmitter_instance = data[data.length - 2];
    let chronoBankPlatformEmitter_instance_events = chronoBankPlatformEmitter_instance.allEvents({fromBlock: 0});
    chronoBankPlatformEmitter_instance_events.watch((err, result) => {
      if (result && result.event)
        console.log(result.event)
    });

    let chronoMintEmitter_instance = _.last(data);
    let chronoMintEmitter_instance_events = chronoMintEmitter_instance.allEvents({fromBlock: 0});
    chronoMintEmitter_instance_events.watch((err, result) => {
      if (result && result.event)
        console.log(result.event)
    });

    let ChronoMint_instance = _.head(data);

    ChronoMint_instance.addLOC(helpers.bytes32("Bob's Hard Workers"),
      helpers.bytes32("www.ru"),
      1000000,
      helpers.bytes32fromBase58("QmTeW79w7QQ6Npa3b1d5tANreCDxF2iDaAPsDvW6KtLmfB"),
      Math.round(+new Date()/1000),
      helpers.bytes32('LHT'));

  });