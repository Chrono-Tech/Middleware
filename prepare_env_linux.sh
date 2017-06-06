#!/bin/bash

#rm -rf SmartContracts
#git clone -b develop https://github.com/ChronoBank/SmartContracts.git
(cd SmartContracts && npm install && cp ../truffle-config.js truffle.js)

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
    echo "RUN DEPLOYMENT TASK OF SMART CONTRACTS..."
    (cd SmartContracts && node ./node_modules/truffle/cli migrate && node ./node_modules/truffle/cli exec setup/*)
else
    echo "COMPILE SMART CONTRACTS"
    (cd SmartContracts && node ./node_modules/truffle/cli compile)
fi