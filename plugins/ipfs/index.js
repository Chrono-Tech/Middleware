const pinModel = require('./models/pinModel'),
  scheduleService = require('./services/scheduleService');

module.exports = (events) => {

  events.on('New', args => {
    let pin = new pinModel({hash: args.addr});
    pin.save();
  });

  scheduleService();

};