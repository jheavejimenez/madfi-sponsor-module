const { task } = require('hardhat/config');
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const lensAddresses = require('./../../lens-protocol/addresses.json');

  // create instance of LensHub
const _getLensHub = async (ethers, signer) => {
  const LensHub = await ethers.getContractFactory('LensHub', {
    libraries: {
      'InteractionLogic': lensAddresses['interaction logic lib'],
      'ProfileTokenURILogic': lensAddresses['profile token uri logic lib'],
      'PublishingLogic': lensAddresses['publishing logic lib']
    }
  });
  const contract = await LensHub.attach(lensAddresses['lensHub proxy']);
  console.log('LensHub deployed to:', contract.address);

  return { lensHub: contract.connect(signer) };
};

task('create-profile', 'creates a profile').setAction(async ({}, hre) => {
  const ethers = hre.ethers;
  const networkName = hre.network.name;
  const [_, governance, user, sponsor] = await ethers.getSigners(); // uses priv key defined in this hardhat config
  const { lensHub } = await _getLensHub(ethers, governance);

  try {
    console.log(`whitelistProfileCreator: ${user.address}`);
    let tx = await lensHub.whitelistProfileCreator(user.address, true);
    await tx.wait();

    const inputStruct = {
      to: user.address,
      handle: process.env.LENS_USER_HANDLE,
      imageURI: process.env.LENS_USER_IMAGE_URI,
      followModule: ZERO_ADDRESS,
      followModuleData: [],
      followNFTURI: process.env.LENS_FOLLOW_NFT_URI,
    };

    tx = await lensHub.connect(user).createProfile(inputStruct);
    await tx.wait();

    console.log(`Total supply (should be 1): ${await lensHub.totalSupply()}`);
    console.log(
      `Profile owner: ${await lensHub.ownerOf(1)}, user address (should be the same): ${user.address}`
    );
    console.log(`Profile ID by handle: ${await lensHub.getProfileIdByHandle(process.env.LENS_USER_HANDLE)}`);
  } catch (error) {
    console.log('revert - likely handle already taken');
  }

  const res = await lensHub.connect(user).getProfile(1);
  console.log(res)
});
