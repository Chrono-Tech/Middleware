rd /s /q SmartContracts
if exist SmartContracts rd /s /q SmartContracts

ECHO downloading repo...

git clone -b develop https://github.com/Mikefluff/SmartContracts.git
cd SmartContracts && git checkout 7cbfaaba94e5308b9642e6da5413e9c9f9828f1b

ECHO installing...

npm install --only=production &&^
xcopy /Y ..\truffle-config.js truffle.js

if "%1" == "--install" (
    echo running deployment task of smart contracts...
    node ./node_modules/truffle/cli migrate &&^
    node ./node_modules/truffle/cli exec setup/4_setup_assets.js

) ELSE (
    echo compiling smart contracts
    node ./node_modules/truffle/cli compile
)