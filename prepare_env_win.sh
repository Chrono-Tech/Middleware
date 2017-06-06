RMDIR /S /Q SmartContracts
git clone -b develop https://github.com/ChronoBank/SmartContracts.git
COPY truffle-config.js SmartContracts/truffle.js
(cd SmartContracts && npm install)
(cd SmartContracts && node ./node_modules/truffle/cli migrate && node ./node_modules/truffle/cli exec setup/4_setup_assets.js)