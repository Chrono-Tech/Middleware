const mongoose = require('mongoose');

/** @model blockModel
 *  @description block model - represents a block in eth
 */
const Block = new mongoose.Schema({
  block: {type: Number},
  created: {type: Date, required: true, default: Date.now},

});

module.exports = mongoose.model('Block', Block);