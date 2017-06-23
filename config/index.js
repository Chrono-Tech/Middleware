const truffle_config = require('../truffle-config');

/**
 * @factory config
 * @description base app's configuration
 * @returns {{
 *  nodes: [*],
 *  web3: *,
 *  schedule: {
 *      job: string,
 *      check_time: number
 *      },
 *  mongo: {
 *    uri: string
 *    },
 *  rest: {
 *    port: number
 *    }
 *    }}
 */

module.exports = {
  nodes: [
    {'host': 'localhost', 'port': '5001', 'protocol': 'http'}
  ],
  web3: truffle_config,
  schedule: {
    job: '30 * * * * *',
    check_time: 0
  },
  mongo: {
    uri: 'mongodb://localhost:27017/data'
  },
  rest: {
    port: 8081
  }
};