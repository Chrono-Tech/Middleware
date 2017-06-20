module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 8547,
      network_id: '*', // Match any network id
      gas: 4700000
    }
  },
  migrations_directory: './migrations'
};
