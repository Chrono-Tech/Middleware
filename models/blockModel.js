const Sequelize = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('block', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    block: {
      type: Sequelize.INTEGER, unique: true
    }
  })
};