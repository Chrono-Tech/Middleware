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