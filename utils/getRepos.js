const GitHub = require('github-api'),
  _ = require('lodash'),
  Promise = require('bluebird');

module.exports = async () => {
  let gh = new GitHub();
  let chrono = Promise.promisifyAll(gh.getOrganization('chronobank'));

  let repos = await chrono.getReposAsync();
  let predicate = new RegExp(/middleware-((?!service).*)-/);
  repos = _.chain(repos)
    .filter(repo => predicate.test(repo.name))
    .map(repo => ({
      url: repo.full_name,
      name: repo.name,
      type: _.chain(repo.name.match(predicate)).last().split('-').head().value(),
      tags_url: repo.tags_url,
      branches_url: repo.branches_url.replace('{/branch}', '')
    }))
    .value();

  return repos;

};
