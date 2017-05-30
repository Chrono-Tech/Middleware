const Sequelize = require('sequelize');

module.exports = (sequelize)=>{
  return sequelize.define('pin', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    hash: {
      type: Sequelize.STRING, unique: true
    }
  })
};