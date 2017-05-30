const _ = require('lodash'),
  config = require('../config.json'),
  require_all = require('require-all'),
  path = require('path'),
  Sequelize = require('sequelize'),
  contracts = require_all({
    dirname: path.join(__dirname, '..', 'SmartContracts', 'build', 'contracts'),
    filter: /(.+)\.json$/,
  });

module.exports = (sequelize) => {

  let c = _.values(contracts)[4];

  let v = _.chain(contracts)
    .values()
    .map(contract=> _.filter(contract.abi, {type: 'event'}))
    .flatten()
    .uniqBy('name')
    .map(ev => {
      return sequelize.define(ev.name,
        _.chain(ev.inputs).transform((result, obj) => {
          result[obj.name] = {type: ['uint256'].includes(obj.type) ? Sequelize.INTEGER : Sequelize.STRING}
        }, {}).merge({
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
          }
        }).value())
    })
    .value()

  console.log(v);

};