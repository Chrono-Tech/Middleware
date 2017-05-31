const require_all = require('require-all'),
  _ = require('lodash'),
  plugins = require_all({
    dirname: __dirname,
    filter: /index.js/,
  });

module.exports = _.chain(plugins).omit('index.js')
  .transform((result, value, key)=>{
    result[key] = value['index.js'];
  }, {})
  .value();