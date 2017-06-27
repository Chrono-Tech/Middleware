const mongoose = require('mongoose');

/** @model transactionModel
 *  @description block model - represents a block in eth
 */
const Transaction = new mongoose.Schema({
  blockHash: {type: String},
  blockNumber: {type: String},
  from: {type: String},
  gasUsed: {type: String},
  root: {type: String},
  to: {type: String},
  transactionHash: {type: String, unique: true},
  value: {type: String},
  network: {type: String},
  created: {type: Date, required: true, default: Date.now},

});

module.exports = mongoose.model('Transaction', Transaction);