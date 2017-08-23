const generateSwaggerService = require('../services/generateSwaggerService');


/**
 * @function swaggerRoute
 * @description generate swagger definition for rest API
 * @param app - express instance
 */


module.exports = (router) => {

  router.get('/', (req, res) => {
    res.send(generateSwaggerService.definition);
  });

};