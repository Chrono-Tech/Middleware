ECHO installing...

cd node_modules/chronobank-smart-contracts


if "%1" == "--install" (
    echo running deployment task of smart contracts...
    node ../truffle/cli migrate &&^
    node ../truffle/cli exec setup/4_setup_assets.js

) ELSE (
    echo compiling smart contracts
    node ../truffle/cli compile
)