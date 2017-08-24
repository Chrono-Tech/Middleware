require('dotenv/config');

const config = require('../config'),
  helpers = require('./helpers'),
  net = require('net'),
  path = require('path'),
  require_all = require('require-all'),
  coreTests = require_all({
    dirname: path.join(__dirname, 'core'),
    filter: /(.+test)\.js$/,
    map: name => name.replace('.test', '')
  }),
  contract = require('truffle-contract'),
  contracts = require_all({
    dirname: path.join(__dirname, '../node_modules', 'chronobank-smart-contracts/build/contracts'),
    filter: /(^((ChronoBankPlatformEmitter)|(?!(Emitter|Interface)).)*)\.json$/,
    resolve: Contract => contract(Contract)
  }),
  Web3 = require('web3'),
  web3 = new Web3(),
  smEvents = require('../core/blockProcessor/controllers/eventsCtrl')(contracts),
  mongoose = require('mongoose');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

describe('tests', function () {

  before(async () => {
    let provider = new Web3.providers.IpcProvider(config.web3.uri, net);
    web3.setProvider(provider);
    mongoose.connect(config.mongo.uri);
    for (let contract_name in contracts)
      if (contracts.hasOwnProperty(contract_name)) {
        try {
          contracts[contract_name].setProvider(provider);
          contracts[`${contract_name}Instance`] = await contracts[contract_name].deployed();
        } catch (e) {

        }
      }

    return await helpers.awaitLastBlock(web3);
  });

  after(() => {
    web3.currentProvider.connection.end();
    return mongoose.disconnect();
  });

 // describe('core/blockProcessor', () => coreTests.blockProcessor(web3, contracts, smEvents));

  describe('core/balanceProcessor', () => coreTests.balanceProcessor(web3, contracts, smEvents));

});
