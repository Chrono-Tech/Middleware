#!/bin/bash

echo installing...

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
    (cd node_modules/chronobank-smart-contracts && node ../truffle/build/cli.bundled migrate)
else
    echo "compiling smart contracts"
    (cd node_modules/chronobank-smart-contracts && node ../truffle/build/cli.bundled compile)
fi