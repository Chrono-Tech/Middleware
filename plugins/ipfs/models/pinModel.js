const mongoose = require('mongoose');

/** @model pinModel
 *  @description pin model - is used to store hashes, which need to be pinned
 */
const Pin = new mongoose.Schema({
  hash: {type: String, required: true},
  created: {type: Date, required: true, default: Date.now},
  updated: {type: Date, required: true, default: Date.now},
  network: {type: String}
});

module.exports = mongoose.model('Pin', Pin);