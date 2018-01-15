const fs = require('fs'),
  path = require('path'),
  apps = [
    {
      name: 'block_processor',
      script: 'core/middleware-eth-blockprocessor',
      env: {
        MONGO_URI: 'mongodb://localhost:27017/data',
        RABBIT_URI: 'amqp://localhost:5672',
        RABBIT_SERVICE_NAME: 'app_eth',
        NETWORK: 'development',
        WEB3_URI: '/tmp/development/geth.ipc'
      }
    },
    {
      name: 'balance_processor',
      script: 'core/middleware-eth-balance-processor',
      env: {
        MONGO_URI: 'mongodb://localhost:27017/data',
        RABBIT_URI: 'amqp://localhost:5672',
        RABBIT_SERVICE_NAME: 'app_eth',
        NETWORK: 'development',
        WEB3_URI: '/tmp/development/geth.ipc'
      }
    },
    {
      name: 'rest',
      script: 'core/middleware-eth-rest',
      env: {
        MONGO_URI: 'mongodb://localhost:27017/data',
        REST_PORT: 8081,
        NETWORK: 'development',
        WEB3_URI: '/tmp/development/geth.ipc'
      }
    },
    {
      name: 'ipfs',
      script: 'core/middleware-eth-ipfs',
      env: {
        MONGO_URI: 'mongodb://localhost:27017/data',
        RABBIT_URI: 'amqp://localhost:5672',
        RABBIT_SERVICE_NAME: 'app_eth',
        IPFS_NODES: 'http://localhost:5001',
        SCHEDULE_JOB: '30 * * * * *',
        SM_EVENTS: 'setHash:newHash:oldHash'
      }
    },
    {
      name: 'chrono_sc_processor',
      script: 'core/middleware-eth-chrono-sc-processor',
      env: {
        MONGO_URI: 'mongodb://localhost:27017/data',
        RABBIT_URI: 'amqp://localhost:5672',
        SMART_CONTRACTS_EVENTS_TTL: 0,
        RABBIT_SERVICE_NAME: 'app_eth',
        NETWORK: 'development',
        WEB3_URI: '/tmp/development/geth.ipc'
      }
    },
    {
      name: 'erc20_processor',
      script: 'core/middleware-eth-erc20',
      env: {
        MONGO_URI: 'mongodb://localhost:27017/data',
        RABBIT_URI: 'amqp://localhost:5672',
        RABBIT_SERVICE_NAME: 'app_eth',
        NETWORK: 'development',
        WEB3_URI: '/tmp/development/geth.ipc'
      }
    }
  ];

module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps: apps.filter(app => fs.existsSync(path.join(__dirname, app.script)))
};
