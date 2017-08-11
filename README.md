# Middleware [![Build Status](https://travis-ci.org/ega-forever/Middleware.svg?branch=master)](https://travis-ci.org/ega-forever/Middleware)

Middleware services for chronobank

Features:
  - Record all events from Chronomint and Chronobank smart contracts
  - Keep transactions of registered users
  - has a build-in plugin system

### Installation

1) Clone the repo
2) run:
```
npm install
```
2) setup your network for truffle contracts in node_modules/chronobank-smart-contracts/truffle.js (for test purpose, you can miss this step - it's configured on default development network, running on localhost:8545)
3) run ethereum / testrpc (for testrpc you can use "npm run testrpc")
4) run environment preparation script - thus will install all contracts on your ethereum network / testrpc:
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
To apply your configuration, create a .env file in root folder of repo (in case it's not present already).
Below is the expamle configuration:

```
MONGO_URI=mongodb://localhost:27017/data
REST_PORT=8081
IPFS_NODES=http://localhost:5001, http://localhost:5001
SCHEDULE_JOB=30 * * * * *
SCHEDULE_CHECK_TIME=0
RABBIT_URI=amqp://localhost:5672
DOMAIN=localhost
```

The options are presented below:

| name | description|
| ------ | ------ |
| MONGO_URI   | the URI string for mongo connection
| REST_PORT   | rest plugin port
| IPFS_NODES   | should contain a comma separated uri connection strings for ipfs nodes
| SCHEDULE_JOB   | a configuration for ipfs pin plugin in a cron based format
| SCHEDULE_CHECK_TIME   | an option, which defines how old should be records, which have to be pinned
| RABBIT_URI   | rabbitmq URI connection string

### Run
Just cd to root project's dir and type:
```
node .
```

### REST plugin's API
In order to retrieve the saved records from db,
we expose them via rest api. The route system is look like so:

| route | methods | params | description |
| ------ | ------ | ------ | ------ |
| /events   | GET | |returns list of all available events
| /events/{event_name}   | GET | |returns an event's collection
| /transactions   | GET |  | returns an transaction's collection
| /events/listener   | POST | event - event's name, filter - object, by which event's data will be filtered | register an event's listener with certain criteria (or filter) - when event is emitted, a callback will be fired with event's data and send it with POST request

#### REST guery language

Every collection could be fetched with an additional query. The api use [query-to-mongo-and-back](https://github.com/ega-forever/query-to-mongo-and-back) plugin as a backbone layer between GET request queries and mongo's. For instance, if we want to fetch all recods from collection 'issue', where issueNumber < 20, then we will make a call like that:
```
curl http://localhost:8080/events/issue?issueNumber<20
```

For more information about queries, please refer to [query-to-mongo-and-back](https://github.com/ega-forever/query-to-mongo-and-back).

### AMQP service

For the moment, amqp is used as a transport layer for delivering data, received from emitted events from smart contracts. In order to use this feature, you need:
1) register your event (via rest service)
2) then register your consumer via amqp - send to events:register queue the json object:
```
{id: event_id, client: client_name}
```
3) finally consume (listen) to messages from queue called 'events:{event_id}.{client_name}'.


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
In order, to run your own plugin, create a directory under plugins (which should be called by your plugin name). Under created directory create file "index.js" - which is served as an entry point, and accepts 1 param, which serves as context of app, and exposes:
1) events - which is an eventEmitter instance (which emits events from smart contracts)
2) contracts_instances - which is an object, that contains instances of contracts (so you could manipulate them in your own manner)
3) eventModels - mongo models
4) contracts - not initialized contracts
5) network - which is a network's name
All plugins are loaded to system by default, so no need in extra declaration.



License
----

MIT