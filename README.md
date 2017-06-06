# Middleware

Middleware services for chronobank

Features:
  - Record all events from Chronomint and Chronobank smart contracts
  - has a build-in plugin system

### Installation

1) Clone the repo
2) setup your network for truffle contracts in truffle-config.js
2) run:
```
npm install
```
3) run environment preparation script - thus will download smartContracts repo, and will install all contracts on your ethereum network / testrpc:
```
npm run prepare_linux
```
or, if you are on windows:
```
npm run prepare_win
```

### Configure
The config.json you can find in the root folder of project (which already includes default settings):

```
{
  "nodes":[
    {"host": "localhost", "port": "32771", "protocol": "http"},
    {"host": "ipfs.infura.io", "port": "5001", "protocol": "https"}
  ],
  "web3": {
    "url" : "http://localhost:8547"
  },
  "schedule": {
    "job": "30 * * * * *",
    "check_time": 0
  },
  "mongo": {
    "uri": "mongodb://localhost:32772/data"
  }
}
```

The options are presented below:

| name | description|
| ------ | ------ |
| nodes[array]   | contains an array of ipfs nodes
| web3[object]   | contains an url address of eth
| schedule[object]   | represent cron job (for ipfs plugin)
| mongo[object]   | mongo uri connection string


### Run
Just cp to root project's dir and type:
```
node .
```


### Testing
Truffle is shipped with it's own testing system, so you just need to call it from contracts dir:

```sh
cd contracts
truffle test
```

### Interfaces

Contract interfaces:

| Interface | params | description|
| ------ | ------ |  ------ |
| Vote[constructor]   | min_vote_days [uint], max_vote_days[uint], owner_name[string] | constructor, create contract, with set min and max voting days for every new potential voter
| addValidator   | user_addr [address], username [string] | adds new potential validator
| voteValidator   | votee_addr [address] | vote for potential validator
| getVotees   |  | get potential validators list
| getValidatorsCount   |  | get amount of validators


License
----

MIT