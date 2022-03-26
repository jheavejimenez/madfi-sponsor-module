require('dotenv').config();

const hre = require('hardhat');

const networkName = hre.network.name;
if (!networkName) throw new Error('Error: must set env: HARDHAT_NETWORK');
const { contractsDeployed, config } = require('./utils/migrations');

// create instance of SponsorModule
const _getContracts = async (ethers) => {
  const SponsorModule = await ethers.getContractFactory('SponsorModule');
  const contract = await SponsorModule.attach(contractsDeployed['SponsorModule']);
  console.log('SponsorModule deployed to:', contract.address);

  return { sponsorModule: contract };
};

// user creates a profile
const createProfile = async () => {

}

// user creates a publication and inits the reference module
// - superToken
// - flowRate (per second)
// - minimum seconds (> 60min)
// - tag
const createPublication = async () => {

}

async function main() {
  const [{ address }] = await hre.ethers.getSigners();
  console.log(`account: ${address}`);

  const { sponsorModule } = await _getContracts(hre.ethers);
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
