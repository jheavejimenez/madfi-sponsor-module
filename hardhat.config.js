require('@nomiclabs/hardhat-truffle5');
require('hardhat-deploy');
require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-etherscan');
require('hardhat-gas-reporter');
require('@typechain/hardhat');
require('dotenv').config();

const glob = require('glob');
const path = require('path');

if (!process.env.SKIP_LOAD) {
  glob.sync('./tasks/**/*.js').forEach(function (file) {
    require(path.resolve(file));
  });
}

const settings = {
  optimizer: {
    enabled: true,
    runs: 200
  }
};

const lensTestWallets = () => {
  // const accounts = require('./../lens-protocol/helpers/test-wallets.ts');
  const accounts = [
    {
      secretKey: '0xc5e8f61d1ab959b397eecc0a37a6517b8e67a0e7cf1f4bce5591f3ed80199122',
    },
    {
      secretKey: '0xd49743deccbccc5dc7baa8e69e5be03298da8688a15dd202e20f15d5e0e9a9fb',
    },
    {
      secretKey: '0x23c601ae397441f3ef6f1075dcb0031ff17fb079837beadaf3c84d96c6f3e569',
    },
    {
      secretKey: '0xee9d129c1997549ee09c0757af5939b2483d80ad649a0eda68e8b0357ad11131',
    },
    {
      secretKey: '0x87630b2d1de0fbd5044eb6891b3d9d98c34c8d310c852f98550ba774480e47cc',
    }
  ];
  const deployer = accounts[0].secretKey;
  const governance = accounts[1].secretKey;
  const user = accounts[3].secretKey;
  const sponsor = accounts[4].secretKey;

  return [deployer, governance, user, sponsor];
}

module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.10',
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
    docker: {
      url: 'http://127.0.0.1:8545',
      accounts: lensTestWallets()
    },
    tunnel: {
      url: 'https://madfi.ngrok.io',
      accounts: lensTestWallets()
    },
  }
};
