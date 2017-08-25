module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps: [
    {
      name: 'block_processor',
      script: 'core/blockProcessor',
      env: {
        MONGO_URI: 'mongodb://localhost:27017/data',
        RABBIT_URI: 'amqp://localhost:5672',
        SMART_CONTRACTS_EVENTS_LISTEN: 1,
        SMART_CONTRACTS_EVENTS_TTL: 0,
        TRANSACTION_TTL: 0,
        NETWORK: 'development'
      }
    },
    {
      name: 'balance_processor',
      script: 'core/balanceProcessor',
      env: {
        MONGO_URI: 'mongodb://localhost:27017/data',
        RABBIT_URI: 'amqp://localhost:5672'
      }
    },
    {
      name: 'rest',
      script: 'core/rest',
      env: {
        MONGO_URI: 'mongodb://localhost:27017/data',
        REST_PORT: 8081,
        SMART_CONTRACTS_EVENTS_LISTEN: 1
      }
    },
    {
      name: 'ipfs',
      script: 'core/ipfs',
      env: {
        MONGO_URI: 'mongodb://localhost:27017/data',
        RABBIT_URI: 'amqp://localhost:5672',
        IPFS_NODES: 'http://localhost:5001',
        SCHEDULE_JOB: '30 * * * * *',
        SCHEDULE_CHECK_TIME: 0
      }
    }
  ]
};
