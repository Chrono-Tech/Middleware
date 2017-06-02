const bs58 = require('bs58');

module.exports = stringOrNumber =>
  `0x${new Buffer(bs58.decode(stringOrNumber)).toString('hex').substr(4)}`;