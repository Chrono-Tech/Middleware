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
    check_time: parseInt(process.env.SCHEDULE_CHECK_TIME) || 0
  },
  mongo: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/data'
  },
  rest: {
    domain: process.env.DOMAIN || 'localhost',
    port: parseInt(process.env.REST_PORT) || 8081
  },
  rabbit: {
    url: process.env.RABBIT_URI || 'amqp://localhost:5672'
  },
  smartContracts: {
    listenEvents: process.env.SMART_CONTRACTS_LISTEN_EVENTS || false
  }
};