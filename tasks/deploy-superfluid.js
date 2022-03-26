const { task } = require('hardhat/config');

const deployFramework = require('@superfluid-finance/ethereum-contracts/scripts/deploy-framework');
const deployTestToken = require('@superfluid-finance/ethereum-contracts/scripts/deploy-test-token');
const deploySuperToken = require('@superfluid-finance/ethereum-contracts/scripts/deploy-super-token');
const SuperfluidSDK = require('@superfluid-finance/js-sdk');
const { updateContractsDeployed } = require('./../scripts/utils/migrations');

// this.web3.getNetwork is used by `SuperfluidSDK`
const deploySuperfluid = async (web3) => {
  await deployFramework((error) => { console.log(error) }, { web3 });
  await deployTestToken((error) => { console.log(error) }, [':', 'fUSDC'], { web3 });
  await deploySuperToken((error) => { console.log(error) }, [':', 'fUSDC'], { web3 });
}

task('deploy-superfluid', 'deploys the superfluid protocol').setAction(async ({}, { web3 }) => {
  await deploySuperfluid(web3);
});
