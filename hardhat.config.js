require('@nomiclabs/hardhat-truffle5');
require('hardhat-deploy');
require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-etherscan');
require('hardhat-gas-reporter');
require('dotenv').config();

const settings = {
  optimizer: {
    enabled: true,
    runs: 200
  }
};

module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.10',
        settings
      },
      {
        version: '0.6.6',
        settings
      },
      {
        version: '0.7.0',
        settings
      }
    ],
  },
  paths: {
    artifacts: './build'
  },
  namedAccounts: {
    deployer: {
      default: 0, // here this will by default take the first account as deployer
      1: 0, // similarly on mainnet it will take the first account as deployer. Note though that depending on how hardhat network are configured, the account 0 on one network can be different than on another
    },
  },
  etherscan: {
    apiKey: {
      polygonMumbai: process.env.ETHERSCAN_API_KEY
    }
  },
  gasReporter: {
    currency: 'USD',
    token: 'MATIC',
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    gasPrice: 45, // https://polygonscan.com/gastracker
    gasPriceApi: 'https://api.polygonscan.com/api?module=proxy&action=eth_gasPrice'
  },
  networks: {
    localhost: {
      live: false,
      saveDeployments: true,
      tags: ['local']
    },
    mumbai: {
      url: process.env.ALCHEMY_MUMBAI_URL,
      accounts: [process.env.PRIVATE_KEY, process.env.PRIVATE_KEY_2]
    },
  }
};
