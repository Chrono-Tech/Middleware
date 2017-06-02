const pinModel = require('./models/pinModel'),
  scheduleService = require('./services/scheduleService'),
  bytes32toBase58 = require('./helpers/bytes32toBase58');

module.exports = (events, contracts) => {

  events.on('NewLOC', args => {
    contracts.mint.getLOCByName(args.locName)
      .then(data=>{
        console.log(bytes32toBase58(data[4]));
        let pin = new pinModel({hash: bytes32toBase58(data[4])});
        pin.save();
      })
  });

  scheduleService();

};