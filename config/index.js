const truffle_config = require('../truffle-config');

module.exports = {
  nodes: [
    {'host': 'localhost', 'port': '32771', 'protocol': 'http'}
  ],
  web3: truffle_config,
  schedule: {
    job: '30 * * * * *',
    check_time: 0
  },
  mongo: {
    uri: 'mongodb://localhost:32772/data'
  }
};