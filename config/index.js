require('dotenv').config();
const url = require('url'),
  _ = require('lodash');

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
  nodes: process.env.IPFS_NODES ? _.chain(process.env.IPFS_NODES)
    .split(',')
    .map(i => {
      i = url.parse(i.trim());
      return {host: i.hostname, port: i.port, protocol: i.protocol.replace(':', '')};
    })
    .value() :
    [{'host': 'localhost', 'port': '5001', 'protocol': 'http'}],
  web3: {
    network: process.env.NETWORK || 'development',
    uri: `${/^win/.test (process.platform) ? '\\\\.\\pipe\\' : '/tmp/'}${process.env.NETWORK || 'development'}/geth.ipc`
  },
  schedule: {
    job: process.env.SCHEDULE_JOB || '30 * * * * *',
    checkTime: parseInt(process.env.SCHEDULE_CHECK_TIME) || 0
  },
  mongo: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/data'
  },
  rabbit: {
    url: process.env.RABBIT_URI || 'amqp://localhost:5672'
  },
  smartContracts: {
    events: {
      listen: parseInt(process.env.SMART_CONTRACTS_EVENTS_LISTEN) || false,
      ttl: parseInt(process.env.SMART_CONTRACTS_EVENTS_TTL) || false
    }
  },
  transactions: {
    ttl: parseInt(process.env.TRANSACTION_TTL) || false
  },
  modules: [
    {
      name: 'middleware-eth-blockprocessor',
      url: 'ChronoBank/middleware-eth-blockprocessor'
    },
    {
      name: 'middleware-eth-rest',
      url: 'ChronoBank/middleware-eth-rest'
    },
    {
      name: 'middleware-eth-ipfs',
      url: 'ChronoBank/middleware-eth-ipfs'
    },
    {
      name: 'middleware-eth-chrono-sc-processor',
      url: 'ChronoBank/middleware-eth-chrono-sc-processor'
    },
    {
      name: 'middleware-eth-balance-processor',
      url: 'ChronoBank/middleware-eth-balance-processor'
    }
  ]
};