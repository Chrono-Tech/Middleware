# Middleware [![Build Status](https://travis-ci.org/ega-forever/Middleware.svg?branch=master)](https://travis-ci.org/ega-forever/Middleware)

Middleware services for chronobank

Features:
  - Record all events from Chronomint and Chronobank smart contracts
  - has a build-in plugin system

### Installation

1) Clone the repo
2) setup your network for truffle contracts in truffle-config.js
3) run ethereum / testrpc (for testrpc you can use "npm run testrpc")
4) run:
```
npm install
```
3) run environment preparation script - thus will download smartContracts repo, and will install all contracts on your ethereum network / testrpc:
```
npm run prepare_linux_install
```
or, if you are on windows:
```
npm run prepare_win_install
```

3.1) in case you just want compile contracts (without deploy), then use these commands:
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
    {"host": "ipfs.infura.io", "port": "5001", "protocol": "https"}
  ],
  "web3": {
    "url" : "http://localhost:8545"
  },
  "schedule": {
    "job": "30 * * * * *",
    "check_time": 0
  },
  "mongo": {
    "uri": "mongodb://localhost:27017/data"
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
Just cd to root project's dir and type:
```
node .
```


### Testing
Right now, only integration tests are provided. Thus should check:
1) the ability of "event daemon" catching and saving events in right collections
2) right ping to ipfs through "ipfs ping daemon"

In order to run them, type:
```sh
npm run test
```

### Development
As you've already pointed out, the system supports custom plugins. You can find one called "ipfs" as an example.
In order, to run your own plugin, create a directory under plugins (which should be called by your plugin name). Under created directory create file "index.js" - which is served as an entry point, and accepts 2 params: events - which is an eventEmitter instance (which emits events from smart contracts) and contracts - which is an object, that contains instances of contracts (so you could manipulate them in your own manner).
All plugins are loaded to system by default, so no need in extra declaration.



License
----

MIT