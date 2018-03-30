const GitHub = require('github-api'),
  _ = require('lodash'),
  Promise = require('bluebird');

module.exports = async () => {
  let gh = new GitHub({
    token: process.env.GITHUB_API_KEY
  });
  let chrono = Promise.promisifyAll(gh.getOrganization('chronobank'));

  let repos = await chrono.getReposAsync();
  let predicate = new RegExp(/middleware-((?!service).*)-/);
  repos = _.chain(repos)
    .filter(repo => predicate.test(repo.name))
    .map(repo => ({
      url: repo.full_name,
      name: repo.name,
      type: _.chain(repo.name.match(predicate)).last().split('-').head().value(),
      tagsUrl: repo.tags_url,
      branchesUrl: repo.branches_url.replace('{/branch}', '')
    }))
    .value();

  return repos;

};
