const { task } = require('hardhat/config');
const lensAddresses = require('./../../lens-protocol/addresses.json');
const { SponsorModule, Superfluid } = require('./../scripts/utils/docker-contracts.json');

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

task('create-post', 'publishes a post and sets the reference module').setAction(async ({}, hre) => {
  const ethers = hre.ethers;
  const networkName = hre.network.name;
  const [_, governance, user] = await ethers.getSigners(); // uses priv key defined in this hardhat config
  const { lensHub } = await _getLensHub(ethers, governance);
  const emptyCollectModuleAddr = lensAddresses['empty collect module'];

  // superToken, flowRate, minSeconds, tag
  const data = ethers.utils.defaultAbiCoder.encode(
    ['address', 'int96', 'int96', 'string'],
    [Superfluid.fUSDCx, 1, 3600, 'cats']
  );

  console.log(`create post with ref module SponsorModule (at: ${SponsorModule})`);
  const inputStruct = {
    profileId: 1,
    contentURI: 'ipfs://QmWGAFtzyzB6A6gYMnb6838hysHuT2rcV8B98Gmj4T4pyY/3958.json',
    collectModule: emptyCollectModuleAddr,
    collectModuleData: [],
    referenceModule: SponsorModule,
    referenceModuleData: data,
  };

  const tx = await lensHub.connect(user).post(inputStruct);
  await tx.wait();
  console.log(await lensHub.getPub(1, 1));
});
