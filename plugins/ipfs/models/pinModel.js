const mongoose = require('mongoose');

const Pin = new mongoose.Schema({
  hash: {type: String, required: true},
  created: {type: Date, required: true, default: Date.now}
});

module.exports = mongoose.model('Pin', Pin);