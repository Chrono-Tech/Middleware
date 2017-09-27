# Middleware [![Build Status](https://travis-ci.org/ega-forever/Middleware.svg?branch=master)](https://travis-ci.org/ega-forever/Middleware)

Middleware service installer

###Installation

After cloning repo, do:
```
npm install
```

then just run installer with:
```
node .
```

You should see available modules to install in cli. Check modules you want to install to - and the rest of the work installer will handle.

#### Installation without CLI

If you don't have a chance to run cli - then you can just pass modules, you will to install as args:

```
node . middleware-eth-blockprocessor middleware-eth-rest
```

### Modules
The middleware consists of 4 core modules (for the moment, they are shipped by default in one package, but will be moved
in separate packages in the nearest future).

##### Block processor
This module is used for processing incoming blocks from node (geth/parity). The iteraction with node happens via IPC interface. In order to install this module, you should сheck 'middleware-eth-blockprocessor' in cli menu during installation.

Also, make sure, you have a running client (geth/parity) with IPC interface enabled. The rule, of how to correctly form IPC path and name:

Fow windows - directory doesn't matter (as it will use virtual endpoint). As for Unix/Linux - the path looks like so:
```
/tmp/{network_name}/geth.ipc
```

here is an expample with running geth with ipc, where network_name=development:
```
geth --verbosity=3 --networkid=4 --ipcpath development/geth.ipc
```


##### chronoSC processor

The crono smart contracts (SC) processor is responsible for handling events, emitted on chonobank platform.
In order to install it, check this option in cli:
```
middleware-eth-chrono-sc-processor
```

##### Balance processor
This module is used for updating balances for registered accounts (see a description of accounts in block processor serction).

In order to install it, check this option in cli:
```
middleware-eth-balance-processor
```

##### Rest
Rest module is used for exposing REST API over block processor. It includes GET methods for fetching accounts,
transactions, and events (from smart contracts).

In order to install it, check this option in cli:
```
middleware-eth-rest
```

##### IPFS
IPFS module is used to maintain records of registered users in chronobank in ipfs.
This module is a part of sc module.
In order to install it, check this option in cli:
```
middleware-eth-ipfs
```


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
  apps = [
    {
      name: 'block_processor',
      script: 'core/middleware-eth-blockprocessor',
      env: {
        MONGO_URI: 'mongodb://localhost:27017/data',
        RABBIT_URI: 'amqp://localhost:5672',
        TRANSACTION_TTL: 0,
        NETWORK: 'development'
      }
    },
    {
      name: 'balance_processor',
      script: 'core/middleware-eth-balance-processor',
      env: {
        MONGO_URI: 'mongodb://localhost:27017/data',
        RABBIT_URI: 'amqp://localhost:5672'
      }
    },
    {
      name: 'rest',
      script: 'core/middleware-eth-rest',
      env: {
        MONGO_URI: 'mongodb://localhost:27017/data',
        REST_PORT: 8081,
        SMART_CONTRACTS_EVENTS_LISTEN: 1
      }
    },
    {
      name: 'ipfs',
      script: 'core/middleware-eth-ipfs',
      env: {
        MONGO_URI: 'mongodb://localhost:27017/data',
        RABBIT_URI: 'amqp://localhost:5672',
        IPFS_NODES: 'http://localhost:5001',
        SCHEDULE_JOB: '30 * * * * *',
        SCHEDULE_CHECK_TIME: 0
      }
    },
    {
      name: 'chrono_sc_processor',
      script: 'core/middleware-eth-chrono-sc-processor',
      env: {
        MONGO_URI: 'mongodb://localhost:27017/data',
        RABBIT_URI: 'amqp://localhost:5672',
        SMART_CONTRACTS_EVENTS_TTL: 0,
        NETWORK: 'development'
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