const bs58 = require('bs58');

/**
 * @function bytes32toBase58
 * @description converts stored hash in byte32 format (from eth) to base58
 * @param hexString the hash representation in byte32 format
 */
module.exports = hexString =>
  bs58.encode(Buffer.from(hexString.replace('0x', '1220'), 'hex'));