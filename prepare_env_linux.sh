#!/bin/bash

rm -rf SmartContracts

echo downloading repo...

git clone -b develop https://github.com/Mikefluff/SmartContracts.git
(cd SmartContracts  && git checkout ff14a54921)

echo installing...

(cd SmartContracts && npm install --only=production && cp ../truffle-config.js truffle.js)

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
    (cd SmartContracts && node ./node_modules/truffle/cli migrate && node ./node_modules/truffle/cli exec setup/*)
else
    echo "compiling smart contracts"
    (cd SmartContracts && node ./node_modules/truffle/cli compile)
fi