/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const request = require('request-promise'),
  _ = require('lodash');

module.exports = async () => {

  let repos = await request({
    uri: 'https://api.github.com/orgs/chronobank/repos',
    headers: {
      'User-Agent': 'Request-Promise',
      'Authorization': process.env.GITHUB_API_KEY ? `token ${process.env.GITHUB_API_KEY}` : null
    },
    json: true
  }).catch((err) => {
    console.log(`can't obtain repos due the following error: ${err}`);
    console.log('will try to download the specified repos without validation');
  });

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
