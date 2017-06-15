module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 8547,
      network_id: '*', // Match any network id
      gas: 4700000
    },
    /*    development2: {
     host: 'localhost',
     port: 8545,
     network_id: '*', // Match any network id
     gas: 4700000,
     from: '0x64a5d8b41ba9d01d64016164bf5b51b48440d46d'
     },*/
    development3: {
      host: 'localhost',
      port: 8548,
      network_id: '*', // Match any network id
      gas: 4700000
    },
  },
  migrations_directory: './migrations'
};
