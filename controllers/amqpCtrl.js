const bunyan = require('bunyan'),
  Promise = require('bluebird'),
  config = require('../config'),
  log = bunyan.createLogger({name: 'plugins.rest.services.eventEmitter.eventEmitterService'}),
  amqp = require('amqplib');

/**
 * @module scheduleService
 * @description ping ipfs by specified time in config
 * @see {@link ../../../config.json}
 */


module.exports = async() => {

  //let events = [];
  let conn = null;
  try {
    conn = await amqp.connect(config.rabbit.url);
  } catch (e) {
    log.info('error connecting to rabbitmq');
    log.info('restart process in 5 minutes...');
    await Promise.delay(300 * 1000);
    return process.exit(1);
  }

  conn.once('error', ()=>{
    log.info('unexpected error with connection to rabbitmq happen');
    log.info('restarting...');
    return process.exit(1);
  });

  return conn;

};