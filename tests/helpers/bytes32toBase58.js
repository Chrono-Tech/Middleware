const bs58 = require('bs58');

module.exports = hexString =>
  bs58.encode(Buffer.from(hexString.replace('0x', '1220'), 'hex'));