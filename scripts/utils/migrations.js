const fs = require("fs");
const path = require("path");

const DEFAULT_NETWORK = "localhost";

// to support old way --network localhost
const argValue = (arg, defaultValue) =>
  process.argv.includes(arg)
    ? process.argv[process.argv.indexOf(arg) + 1]
    : typeof defaultValue === "function"
    ? defaultValue()
    : defaultValue;

const network = process.env.HARDHAT_NETWORK || argValue('--network', DEFAULT_NETWORK);
const CONTRACTS_PATH = `./${network}-contracts.json`;
const LENS_CONTRACTS_PATH = '../../../lens-protocol/addresses.json';

const contractsFile = () => path.join(__dirname, CONTRACTS_PATH);
const contractsDeployed = JSON.parse(fs.readFileSync(contractsFile(), "utf8"));

const updateContractsDeployed = (contract, address, network = DEFAULT_NETWORK) => {
  const file = path.join(__dirname, `./${network}-contracts.json`);
  const contracts = JSON.parse(fs.readFileSync(file, 'utf8'));
  contracts[contract] = address;
  fs.writeFileSync(file, JSON.stringify(contracts, null, 2));
};

const updateContractsDeployedLens = (contract, address) => {
  const file = path.join(__dirname, LENS_CONTRACTS_PATH);
  const contracts = JSON.parse(fs.readFileSync(file, 'utf8'));
  contracts[contract] = address;
  fs.writeFileSync(file, JSON.stringify(contracts, null, 2));
};

const updateConfig = (_config) => {
  fs.writeFileSync(path.join(__dirname, './config.json'), JSON.stringify(_config, null, 2));
};

module.exports = {
  CONTRACTS_PATH,
  contractsFile,
  contractsDeployed,
  updateContractsDeployed,
  updateContractsDeployedLens,
  config: require('./config.json'),
  lensAddresses: require(path.join(__dirname, LENS_CONTRACTS_PATH)),
  updateConfig,
};
