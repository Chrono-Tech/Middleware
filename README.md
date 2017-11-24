# Middleware [![Build Status](https://travis-ci.org/ChronoBank/Middleware.svg?branch=master)](https://travis-ci.org/ChronoBank/Middleware)

Middleware service installer

### Installation

first do:
```
npm install -g chronobank-middleware
```

then init skeleton of project:
```
dmt init
```

finally run installer:
```
dmt install
```

You should see available modules to install in cli. Check modules you want to install to - and the rest of the work installer will handle.

#### Installation without CLI

If you don't have a chance to run cli - then you can just pass modules, you will to install as args:

```
dmt install middleware-eth-blockprocessor middleware-eth-rest
```
This will run install the following modules from latest master branch

In order, to obtain certain release (tag) you can do like that:

```
dmt install middleware-eth-blockprocessor#0.0.5 middleware-eth-rest#0.0.5
```

### Modules
The middleware consists of components called 'modules'. Each of them is responsible for certain functionality. Most modules are optional. The only necessary one is blockprocessor, which is responsible for interaction with blockchain node and notify other services about new txs and blocks.

### Configure
There are 2 possible scenarious of running the middleware modules:

##### via .env

To apply your configuration, create a .env file in root folder of project (in case it's not present already).
Below is the expamle configuration:

```
MONGO_URI=mongodb://localhost:27017/data
REST_PORT=8081
IPFS_NODES=http://localhost:5001, http://localhost:5001
SCHEDULE_JOB=30 * * * * *
RABBIT_SERVICE_NAME=app_eth
RABBIT_URI=amqp://localhost:5672
SMART_CONTRACTS_EVENTS_TTL=0
SM_EVENTS=setHash:newHash:oldHash
NETWORK=development
WEB3_URI=/tmp/development/geth.ipc
```

The options are presented below:

| name | description|
| ------ | ------ |
| MONGO_URI   | the URI string for mongo connection
| REST_PORT   | rest plugin port
| IPFS_NODES   | should contain a comma separated uri connection strings for ipfs nodes
| SCHEDULE_JOB   | a configuration for ipfs pin plugin in a cron based format
| RABBIT_SERVICE_NAME   | namespace for all rabbitmq queues, like 'app_eth_transaction'
| RABBIT_URI   | rabbitmq URI connection string
| SMART_CONTRACTS_EVENTS_TTL   | how long should we keep events in db (should be set in seconds)
| SM_EVENTS   | smart contract's event definition for hash create/update (ipfs multihash). Has the following signature: 'event_name:new_hash_field:old_hash_field'. 3 argument (old_hash_field) is optional
| NETWORK   | network name (alias)- is used for connecting via ipc (see block processor section)
| WEB3_URI   | the path to ipc interface

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
apps = [
    {
      name: 'block_processor',
      script: 'core/middleware-eth-blockprocessor',
      env: {
        MONGO_URI: 'mongodb://localhost:27017/data',
        RABBIT_URI: 'amqp://localhost:5672',
        RABBIT_SERVICE_NAME: 'app_eth',
        NETWORK: 'development',
        WEB3_URI: '/tmp/development/geth.ipc'
      }
    },
    {
      name: 'balance_processor',
      script: 'core/middleware-eth-balance-processor',
      env: {
        MONGO_URI: 'mongodb://localhost:27017/data',
        RABBIT_URI: 'amqp://localhost:5672',
        RABBIT_SERVICE_NAME: 'app_eth',
        NETWORK: 'development',
        WEB3_URI: '/tmp/development/geth.ipc'
      }
    },
    {
      name: 'rest',
      script: 'core/middleware-eth-rest',
      env: {
        MONGO_URI: 'mongodb://localhost:27017/data',
        REST_PORT: 8081,
        NETWORK: 'development',
        WEB3_URI: '/tmp/development/geth.ipc'
      }
    },
    {
      name: 'ipfs',
      script: 'core/middleware-eth-ipfs',
      env: {
        MONGO_URI: 'mongodb://localhost:27017/data',
        RABBIT_URI: 'amqp://localhost:5672',
        RABBIT_SERVICE_NAME: 'app_eth',
        IPFS_NODES: 'http://localhost:5001',
        SCHEDULE_JOB: '30 * * * * *',
        SM_EVENTS: 'setHash:newHash:oldHash'
      }
    },
    {
      name: 'chrono_sc_processor',
      script: 'core/middleware-eth-chrono-sc-processor',
      env: {
        MONGO_URI: 'mongodb://localhost:27017/data',
        RABBIT_URI: 'amqp://localhost:5672',
        SMART_CONTRACTS_EVENTS_TTL: 0,
        RABBIT_SERVICE_NAME: 'app_eth',
        NETWORK: 'development',
        WEB3_URI: '/tmp/development/geth.ipc'
      }
    },
    {
      name: 'erc20_processor',
      script: 'core/middleware-eth-erc20',
      env: {
        MONGO_URI: 'mongodb://localhost:27017/data',
        RABBIT_URI: 'amqp://localhost:5672',
        RABBIT_SERVICE_NAME: 'app_eth',
        NETWORK: 'development',
        WEB3_URI: '/tmp/development/geth.ipc'
      }
    }
  ];
```

Options are the same, as in .env. The only difference, is that they are specified for each app in a separate way.
Modules, which are not installed - will be ignored in configuration

After all is done, just start cluster with:
```
pm2 start ecosystem.config.js
```

License
----

MIT