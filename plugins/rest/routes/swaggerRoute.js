const generateSwaggerService = require('../services/generateSwaggerService');

module.exports = (app) => {

  app.get('/swagger', (req, res) => {
    res.send(generateSwaggerService.definition);
  });

};