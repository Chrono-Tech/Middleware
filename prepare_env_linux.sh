#!/bin/bash

echo installing...

package=$(node -p "require('./node_modules/chronobank-smart-contracts/package.json').dependencies.truffle")

echo installing truffle $package

npm install -g $(echo "truffle@"$package)

for i in "$@"
do
case $i in
    -i|--install)
    INSTALL="true"
    shift # past argument=value
    ;;
    *)
    ;;
esac
done

if [[ -n "$INSTALL" ]]; then
    echo "running deployment task of smart contracts..."
    (cd node_modules/chronobank-smart-contracts && truffle migrate && truffle exec setup/*)
else
    echo "compiling smart contracts"
    (cd node_modules/chronobank-smart-contracts && truffle compile)
fi