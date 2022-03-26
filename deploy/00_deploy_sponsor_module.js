const hre = require("hardhat");
const {
  updateContractsDeployed,
  updateContractsDeployedLens,
  config,
  contractsDeployed,
  lensAddresses
} = require('./../scripts/utils/migrations');

module.exports = async ({ getNamedAccounts, deployments, network }) => {
  const { deploy } = deployments;
  const ethers = hre.ethers;
  const networkName = hre.network.name;
  const accounts = await ethers.getSigners();
  const deployer = accounts[0].address;

  // !! AFTER running `npx hardhat full-deploy-local` in the docker container
  const LENS_HUB_PROXY = lensAddresses['lensHub proxy'];
  if (!LENS_HUB_PROXY) throw new Error ('need to define LENS_HUB_PROXY');

  // !! AFTER running the first deploy at '00_deploy_superfluid.js'
  const { host, cfa } = contractsDeployed.Superfluid;
  if (!(host && cfa)) throw new Error ('missing superfluid deployment');

  console.log('\n\t-- Deploying SponsorModule --');
  console.log(JSON.stringify({
    hub: LENS_HUB_PROXY,
    host,
    cfa
  }, null, 2));

  const { address } = await deploy('SponsorModule', {
    from: deployer,
    args: [LENS_HUB_PROXY, host, cfa],
    log: true,
  });

  console.log(`SponsorModule deployed at: ${address}`);

  updateContractsDeployed('SponsorModule', address, networkName);
  updateContractsDeployedLens('SponsorModule', address);
};

module.exports.tags = ['SponsorModule'];
