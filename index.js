const contract = require('./contract'),
  Sequelize = require('sequelize'),
  sequelize = new Sequelize({dialect: 'sqlite', storage: 'database.sqlite'}),
  models = require('./models'),
  pinModel = models.pinModel(sequelize),
  blockModel = models.blockModel(sequelize),
  scheduleCtrl = require('./controllers').scheduleCtrl,
  contractsCtrl = require('./controllers').contractsCtrl,
  Promise = require('bluebird');


return contractsCtrl(sequelize);


Promise.all([
  blockModel.sync()
    .then(() =>
      blockModel.max('block')
    ),
  new contract().init(),
  pinModel.sync()
])
  .spread((fromBlock, contact_instance) => {
    console.log('from: ', fromBlock);
    contact_instance.New({fromBlock: fromBlock || 0}).watch((err, result) => {

      if (fromBlock >= result.blockNumber) {
        return;
      }

      console.log('new block: ', result.blockNumber);
      console.log('new address: ', result.args.addr);
      console.log(result);

      Promise.all([
        pinModel.create({hash: result.args.addr}),
        blockModel.create({block: result.blockNumber})
      ])
        .catch(err => {
          console.log(err)
        });

    });

    contact_instance.Update({fromBlock: fromBlock || 0}).watch((err, result) => {

      if (fromBlock >= result.blockNumber) {
        return;
      }

      console.log('block: ', result.blockNumber);
      console.log('address: ', result.args.addr);
      console.log(result);

      Promise.all([
        pinModel.update({hash: result.args.new_addr}, {
          where: {
            hash: result.args.old_addr
          }
        }),
        blockModel.create({block: result.blockNumber})
      ])
        .catch(err => {
          console.log(err)
        });

    });

  })
  .catch(err => {
    console.log(err);
  });

scheduleCtrl(sequelize);

