const Web3 = require('web3'),
  web3 = new Web3(),
  config = require('../config.json'),
  contract = require("truffle-contract"),
  Event_definition = require(`../truffle/build/contracts/${config.web3.contract.name}`),
  provider = new Web3.providers.HttpProvider(config.web3.url);

module.exports = class Contract {

  constructor() {

    this.Contract = contract(Event_definition);
    web3.setProvider(provider);
    this.Contract.defaults({from: web3.eth.coinbase});
    this.Contract.setProvider(provider);

  }


  init(){
    return this.Contract.deployed();
  }



};