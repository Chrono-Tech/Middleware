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
        MONGO_URI: 'mongodb://localhost:32772/data',
        RABBIT_URI: 'amqp://localhost:32769'
      }
    },
    {
      name: 'balance_processor',
      script: 'core/balanceProcessor',
      env: {
        MONGO_URI: 'mongodb://localhost:32772/data',
        RABBIT_URI: 'amqp://localhost:32769'
      }
    },
    {
      name: 'rest',
      script: 'core/rest',
      env: {
        MONGO_URI: 'mongodb://localhost:32772/data',
        REST_PORT: 8081
      }
    },
    {
      name: 'ipfs',
      script: 'core/ipfs',
      env: {
        MONGO_URI: 'mongodb://localhost:32772/data',
        RABBIT_URI: 'amqp://localhost:32769',
        IPFS_NODES: 'http://localhost:32771',
        SCHEDULE_JOB: '30 * * * * *',
        SCHEDULE_CHECK_TIME: 0
      }
    }
  ]
};
