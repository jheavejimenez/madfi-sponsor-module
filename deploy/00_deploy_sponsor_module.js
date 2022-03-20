const hre = require("hardhat");
const deployFramework = require('@superfluid-finance/ethereum-contracts/scripts/deploy-framework');
const deployTestToken = require('@superfluid-finance/ethereum-contracts/scripts/deploy-test-token');
const deploySuperToken = require('@superfluid-finance/ethereum-contracts/scripts/deploy-super-token');
const SuperfluidSDK = require('@superfluid-finance/js-sdk');
const { updateContractsDeployed, config } = require('./../scripts/utils/migrations');

const getArgs = ({ name }, deployer, superfluidOptions = undefined) => {
  console.log(`getArgs:: from: ${name}`);
  let _config = config[name]?.SponsorModule;

  if (superfluidOptions) {
    console.log('using superfluidOptions');
    _config = {
      ..._config,
      ...superfluidOptions
    };
  }

  console.log(JSON.stringify(_config, null, 2));

  return Object.keys(_config).map((k) => _config[k]);
};

const deploySuperfluid = async (web3, deployer) => {
  await deployFramework((error) => { console.log(error) }, { web3, from: deployer });
  await deployTestToken((error) => { console.log(error) }, [':', 'fDAI'], { web3, from: deployer });
  await deploySuperToken((error) => { console.log(error) }, [':', 'fDAI'], { web3, from: deployer });

  sf = new SuperfluidSDK.Framework({ web3, version: 'test', tokens: ['fDAI'] });
  await sf.initialize();

  return {
    host: sf.host.address,
    cfa: sf.agreements.cfa.address,
    acceptedToken: (await sf.tokens.fDAI.address)
  };
}

module.exports = async ({ getNamedAccounts, deployments, network }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  // skip deploy on `npx hardhat node`
  if (network.name === 'hardhat') return;

  let options;
  if (network.name === 'localhost') {
    options = await deploySuperfluid(hre.web3, deployer);
  }

  const { address } = await deploy('SponsorModule', {
    from: deployer,
    args: getArgs(network, deployer, options),
    log: true,
  });

  updateContractsDeployed('SponsorModule', address, network.name);
};

module.exports.tags = ['SponsorModule'];
