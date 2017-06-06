module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 8547,
      network_id: '*', // Match any network id
      gas: 3290337
    }
  },
  migrations_directory: './migrations'
};
