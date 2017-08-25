# Middleware [![Build Status](https://travis-ci.org/ega-forever/Middleware.svg?branch=master)](https://travis-ci.org/ega-forever/Middleware)

Middleware services for chronobank

Features:
  - Record all events from Chronomint and Chronobank smart contracts
  - Keep transactions of registered users
  - watch for balance changes
  - and even pin ipfs records

### Modules
The middleware consists of 4 core modules (for the moment, they are shipped by default in one package, but will be moved
in separate packages in the nearest future).

##### Block processor
This module is used for processing incoming blocks from node (geth/parity). The iteraction with node happens via IPC interface. In order to install this module, you should run:
```
npm run install:block_processor
```
Thus will install all necessary libs. Beside that, you have to setup a geth/parity node for iteraction via IPC (check [this thread](https://ethereum.stackexchange.com/questions/10681/what-are-ipc-and-rpc)  for better understanding). The IPC path should be built by the appropriate pattern:
for linux:
```
 /tmp/{network_name}/geth.ipc
```
for windows:
```
 \\\\.\\pipe\\{network_name}/geth.ipc
```

here is an expample with running geth with ipc, where network_name=development:
```
geth --verbosity=3 --networkid=4 --ipcpath development/geth.ipc
```

Take into a count - the network name is just an alias for your network (that means you can call it whatever you want),
and it could be specified in .env or in pm2 ecosystem file (please refer to configuration section).

How does it work?

Block processor connects to ipc and fetch blocks one by one. The current prcessed block number then is going to be saved in mongodb unnder "ethblocks" collection with a your current network_name. For instance, if module has parsed 120345 blocks, and the ipc's network_name=super_network, then in mongo, under ethblocks you will find this record:
```
{
    "_id" : ObjectId("599fc7a497ffcb108c863986"),
    "network" : "super_network",
    "__v" : 0,
    "created" : ISODate("2017-08-25T06:46:22.242Z"),
    "block" : 120345
}
```

Which txs block processor save?

Block processor filter txs by specified user accounts (addresses). The addresses are presented in "ethaccounts" collection with the following format:
```
{
    "_id" : ObjectId("599fd82bb9c86c7b74cc809c"),
    "address" : "0x1cc5ceebda535987a4800062f67b9b78be0ef419",
    "balance" : 0.0,
    "created" : 1503647787853
}
```

So, when someone, for instance do a transaction (sample from web3 console):
```
/* eth.accounts[0] - "0x1cc5ceebda535987a4800062f67b9b78be0ef419" */
eth.sendTransaction({from: eth.accounts[0], to: eth.accounts[1], value: 200})
```
this tx is going to be included in next blocks. Block parser fetch these blocks, and filter by "to" and "from" recipients.
If one of them is presented in ethaccounts collection in mongo, then this transaction will be saved in "ethtransactions" collection.
```
{
    "_id" : ObjectId("599fda2931a8353700ee951f"),
    "payload" : "3:0xb432ff1b436ab7f2e6f611f6a52d3a44492c176e1eb5211ad31e21313d4a274f",
    "hash" : "0xb432ff1b436ab7f2e6f611f6a52d3a44492c176e1eb5211ad31e21313d4a274f",
    "blockHash" : "0x6ab9c9c59749fe43557876836066854d84e7e936c1f27832c05642762d16eb0a",
    "blockNumber" : "3",
    "from" : "0x1cc5ceebda535987a4800062f67b9b78be0ef419",
    "to" : "0x48bf12c5650d87007b81e2b1a91bdf6e3d6ede03",
    "value" : "200",
    "created" : ISODate("2017-08-25T08:04:57.389Z")
}
```

All field are the same, as in eth transactio schema, except _id, payload fields. The payload - is a unique indentifier, which is a mix of block_number and hash - block_number:hash.

Why do we use rabbitmq?

Rabbitmq is used for 2 main reasons - the first one for inner communication between different core modules. And the second one - is for notification purpose. When a new transaction arrives and it satisfies the filter - block processor notiffy others about it though rabbitmq exhange strategy. The exnage is called 'events', and it has different kinds of routing keys. For a new tx the routing key is looked like so:

```
eth_transaction.{address}
```
Where address is to or from address. Also, you can subscribe to all eth_transactions events by using wildcard:
```
eth_transaction.*
```

All in all, in order to be subscribed, you need to do the following:
1) check that exchange 'events exist'
2) assert a new queue (this should be your own unique queue)
3) bind your queue to 'events' exchange with appropriate routing key
4) consume (listen) your queue

But be aware of it - when a new tx arrives, the block processor sends 2 messages for the same one transaction - for both addresses, who participated in transaction (from and to recepients). The sent message represent the payload field from transaction object (by this unique field you can easely fetch the raw transaction from mongodb for your own purpose).


What about smart contracts?

Optionaly, you also can catch events, emitted on smart contracts from chronobank. In order to use this feature, you have to install contracts first:
```
npm run install:contracts
```
In case, they are not deployed to the specified network, then you do it with:
```
npm run deploy:contracts
```
But make sure, that you have RPC enabled on your node, it running on default 8545 port, and coinbase account is unlocked.
Also, you need to enable this feature in config (see configuration section).

The flow with events on smart contracts is the same, as for the transaction: during block parsing, block processor use a special filter, which checks logs of the block, and compare addreses and signatures in logs with addresses and signatures of presented events in smart contracts (compare by their definitions). In case, he found smth - it wwill be saved to a collection, named by event name.
For instance, we have an event called 'Tranfer'. When a new event is emitted, block processor catch it, and save to a collection 'transfers'. Also, block parser send notification via rabbitmq, with the routing key, named as event, but with lowercase - in our case 'transfer', and message - are the raw event's arguments, passed to event.


##### Balance processor
This module is used for updating balances for registered accounts (see a description of accounts in block processor serction). In order to install it, just type
```
npm run install:balance_processor
```

How does it work?
When block processor find a new tx, where one registered accounts is present, it push a new message to eth_transaction.* route in events exchnage in rabbitmq. Balance processor listen to it, grab the sent message (which is the payload), get raw tx from mongo and update balances for addresses, which are present in the fetched tx (to and from fields). The balances are present in "ethAccounts" collection. Every new balance update has a notification though rabbitmq as well. The flow, and rules are the same as for subscribing for "eth_transaction" (see block processor section), except routing key has the following format:
```
eth_balance.{address}
```
And message - is an actual balance.


##### Rest
Rest module is used for exposing REST API over block processor. It includes GET methods for fetching accounts,
transactions, and events (from smart contracts).
In order to install it, just type
```
npm run install:balance_processor
```

The available routes are listed below:

| route | methods | params | description |
| ------ | ------ | ------ | ------ |
| /transactions   | GET |  | returns an transaction's collection
| /transactions/accounts   | GET | |returns list of registered accounts
| /transactions/account   | POST |address - user's address |register a new account
| /transactions/account   | DELETE |address - user's address | remove registered account
| /events   | GET | |returns list of all available events
| /events/{event_name}   | GET | |returns an event's collection
| /events/listener   | POST | event - event's name, filter - object, by which event's data will be filtered | register an event's listener with certain criteria (or filter) - when event is emitted, a callback will be fired with event's data and send it with POST request

#### REST guery language

Every collection could be fetched with an additional query. The api use [query-to-mongo-and-back](https://github.com/ega-forever/query-to-mongo-and-back) plugin as a backbone layer between GET request queries and mongo's. For instance, if we want to fetch all recods from collection 'issue', where issueNumber < 20, then we will make a call like that:
```
curl http://localhost:8080/events/issue?issueNumber<20
```

For more information about queries, please refer to [query-to-mongo-and-back](https://github.com/ega-forever/query-to-mongo-and-back).

### Cluster

### Configure
There are 2 possible scenarious of running the middleware modules:

##### via .env

To apply your configuration, create a .env file in root folder of repo (in case it's not present already).
Below is the expamle configuration:

```
MONGO_URI=mongodb://localhost:27017/data
REST_PORT=8081
IPFS_NODES=http://localhost:5001, http://localhost:5001
SCHEDULE_JOB=30 * * * * *
SCHEDULE_CHECK_TIME=0
RABBIT_URI=amqp://localhost:5672
SMART_CONTRACTS_EVENTS_LISTEN=1
SMART_CONTRACTS_EVENTS_TTL=0
TRANSACTION_TTL=0
NETWORK=development
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
| SMART_CONTRACTS_EVENTS_LISTEN   | listen to smart contracts - can be 1 or 0
| SMART_CONTRACTS_EVENTS_TTL   | how long should we keep events in db (should be set in seconds)
| TRANSACTION_TTL   | how long should we keep transactions in db (should be set in seconds)
| NETWORK   | network name (alias)- is used for connecting via ipc (see block processor section)

In this case, you should run the processes from the root folder, like that:
```
node core/blockProcessor
```

##### via ecosystem.config.js

If you want to run a cluster, then you need to install pm2 manager first:
```
npm install -g pm2
```

And edit the ecosystem.config.js according your needs:
```
module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps: [
    {
      name: 'block_processor',
      script: 'core/blockProcessor',
      env: {
        MONGO_URI: 'mongodb://localhost:32772/data',
        RABBIT_URI: 'amqp://localhost:32769',
        SMART_CONTRACTS_EVENTS_LISTEN: 1,
        SMART_CONTRACTS_EVENTS_TTL: 0,
        TRANSACTION_TTL: 0,
        NETWORK: 'development'
      }
    },
    {
      name: 'balance_processor',
      script: 'core/balanceProcessor',
      env: {
        MONGO_URI: 'mongodb://localhost:32772/data',
        RABBIT_URI: 'amqp://localhost:32769'
      }
    },
    {
      name: 'rest',
      script: 'core/rest',
      env: {
        MONGO_URI: 'mongodb://localhost:32772/data',
        REST_PORT: 8081,
        SMART_CONTRACTS_EVENTS_LISTEN: 1
      }
    },
    {
      name: 'ipfs',
      script: 'core/ipfs',
      env: {
        MONGO_URI: 'mongodb://localhost:32772/data',
        RABBIT_URI: 'amqp://localhost:32769',
        IPFS_NODES: 'http://localhost:32771',
        SCHEDULE_JOB: '30 * * * * *',
        SCHEDULE_CHECK_TIME: 0
      }
    }
  ]
};
```

Options are the same, as in .env. The only difference, is that they are specified for each app in a separate way.
Modules, which you don't want to run - you can remove or comment.

After all is done, just start cluster with:
```
pm2 start ecosystem.config.js
```


License
----

MIT