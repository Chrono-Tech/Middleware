const mongoose = require('mongoose');

const Block = new mongoose.Schema({
  block: {type: Number},
  created: {type: Date, required: true, default: Date.now},

});

module.exports = mongoose.model('Block', Block);