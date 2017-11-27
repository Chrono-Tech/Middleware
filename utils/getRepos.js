const GitHub = require('github-api'),
  _ = require('lodash'),
  Promise = require('bluebird');

module.exports = async () => {
  let gh = new GitHub();
  let chrono = Promise.promisifyAll(gh.getOrganization('chronobank'));

  let repos = await chrono.getReposAsync();
  let predicate = new RegExp(/middleware-([0-9a-zA-Z]*)-/);
  repos = _.chain(repos)
    .filter(repo => predicate.test(repo.name))
    .map(repo => ({
      url: repo.full_name,
      name: repo.name,
      type: _.last(repo.name.match(predicate)),
      tags_url: repo.tags_url
    }))
    .value();

  return repos;

};
