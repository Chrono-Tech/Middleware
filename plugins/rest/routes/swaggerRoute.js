const generateSwaggerService = require('../services/generateSwaggerService');


/**
 * @function swaggerRoute
 * @description generate swagger definition for rest API
 * @param app - express instance
 */


module.exports = (app) => {

  app.get('/swagger', (req, res) => {
    res.send(generateSwaggerService.definition);
  });

};