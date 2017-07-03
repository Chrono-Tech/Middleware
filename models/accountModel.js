const mongoose = require('mongoose');

/** @model accountModel
 *  @description account model - represents an eth account
 */
const Account = new mongoose.Schema({
  address: {type: String, unique: true},
  created: {type: Date, required: true, default: Date.now},

});

module.exports = mongoose.model('Account', Account);