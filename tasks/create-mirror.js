const { task } = require('hardhat/config');
const { Framework } = require('@superfluid-finance/sdk-core');
const SuperTokenABI = require("@superfluid-finance/ethereum-contracts/build/contracts/ISuperToken.json").abi;
const ERC20ABI = require("@openzeppelin/contracts/build/contracts/ERC20PresetMinterPauser.json").abi;
const lensAddresses = require('./../../lens-protocol/addresses.json');
const { SponsorModule, Superfluid } = require('./../scripts/utils/docker-contracts.json');
const MAX_UINT256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

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

const _buildBurnWithSigParams = (
  nft,
  name,
  tokenId,
  nonce,
  deadline
) => ({
  types: {
    BurnWithSig: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  },
  domain: {
    name: name,
    version: '1',
    chainId: hre.network.config.chainId || 31337, // HARDHAT_CHAINID
    verifyingContract: nft,
  },
  value: {
    tokenId: tokenId,
    nonce: nonce,
    deadline: deadline,
  },
});

const _getBurnWithSigparts = async (
  ethers,
  wallet,
  nft,
  name,
  tokenId,
  nonce,
  deadline
) => {
  const { domain, types, value } = _buildBurnWithSigParams(nft, name, tokenId, nonce, deadline);
  const sig = await wallet._signTypedData(domain, types, value);
  return ethers.utils.splitSignature(sig);
};

const getBurnSig = async (lensHub, ethers, sponsorWallet, profileId) => {
  const LENS_HUB_NFT_NAME = 'Various Vegetables' // @TODO: not sure this is just for their testing or...
  const nonce = (await lensHub.sigNonces(sponsorWallet.address)).toNumber();
  const _nextPubId = await lensHub.getPubCount(profileId);
  const nextPubId = _nextPubId.toNumber() + 1;

  // creating signature to burn our next pub - the mirrored pub
  const { v, r, s } = await _getBurnWithSigparts(
    ethers,
    sponsorWallet,
    lensHub.address,
    LENS_HUB_NFT_NAME,
    nextPubId,
    nonce,
    MAX_UINT256
  );

  return ethers.utils.defaultAbiCoder.encode(
    ['uint8', 'bytes32', 'bytes32', 'uint256'],
    [v, r, s, MAX_UINT256]
  );
};

// Once the sponsor knows the profile and post they want to re-share - they see the hourly fee for the sponsorship (ex: 10 USDC per hour - min 1 hour - must close the sponsorship lose deposit).
// 1. Click “Top-Up + Sponsor” (first approves the transfer of USDC to the Super Token contract to upgrade; unless there is already a balance of USDCx in the wallet)
// 2. createStream with the post owner
// 3. Sign + submit mirror tx
task('create-mirror', 'creates a mirror on a Sponsored post by first creating a money stream with its owner').setAction(async ({}, hre) => {
  const ethers = hre.ethers;
  const networkName = hre.network.name;
  const [_, governance, user, sponsor] = await ethers.getSigners(); // uses priv key defined in this hardhat config
  const { lensHub } = await _getLensHub(ethers, governance);

  console.log(`sponsor: ${sponsor.address}`);
  console.log(`user: ${user.address}`);

  // superfuid
  const sf = await Framework.create({
    networkName: hre.network.name,
    provider: lensHub.provider,
    dataMode: "WEB3_ONLY",
    protocolReleaseVersion: "test",
    resolverAddress: Superfluid.resolver // from deployment output
  });
  const signer = sf.createSigner({
    privateKey: process.env.LENS_DOCKER_PRIVATE_KEY_SPONSOR, // sponsor
    provider: lensHub.provider
  });

  console.log('superfluid initialized');
  let token = await new ethers.Contract(Superfluid.fUSDC, ERC20ABI, _); // mintable
  const superToken = await sf.loadSuperToken('fUSDCx');

  await token.mint(sponsor.address, (1 * 1e19).toString());
  token = await new ethers.Contract(Superfluid.fUSDC, ERC20ABI, sponsor); // approve from sponsor wallet
  await token.approve(superToken.address, (1 * 1e19).toString());

  const { maxFeePerGas, maxPriorityFeePerGas } = await ethers.provider.getFeeData();
  await superToken
    .upgrade({ amount: (1 * 1e19).toString(), overrides: { maxFeePerGas, maxPriorityFeePerGas, gasLimit: 2100000 } })
    .exec(signer);
  console.log('sponsor wallet topped up with fUSDCx');

  // @TODO: get from lens api
  const profileIdPointed = 1;
  const pubIdPointed = await lensHub.getPubCount(profileIdPointed); // mirror the latest one
  const profileId = 2; // sponsor profileId
  console.log(`encoding: ${profileIdPointed}, ${pubIdPointed}, burnData`);

  // LIKELY NOT GOING TO BE USED AS POSTS ARE NOT NFTs :/
  // this is to be decoded in the contract to later burn the nft once the stream is closed
  const burnData = await getBurnSig(lensHub, ethers, sponsor, profileId);

  const userData = ethers.utils.defaultAbiCoder.encode(
    ['uint256', 'uint256'],
    [profileIdPointed, pubIdPointed]
  );

  // const flowRate = ethers.utils.parseUnits('0.0001', 'ether');
  const flowRate = '2'; // pubReferenceData = [Superfluid.fUSDCx, 1, 3600, 'cats'];

  // create the stream with encoded data
  try {
    const { maxFeePerGas, maxPriorityFeePerGas } = await ethers.provider.getFeeData();
    console.log(`SponsorModule: ${SponsorModule}`);
    console.log('sf.cfaV1.createFlow()')
    const createFlowOperation = sf.cfaV1.createFlow({
      sender: sponsor.address,
      receiver: SponsorModule,
      flowRate: flowRate,
      superToken: Superfluid.fUSDCx,
      userData,
      overrides: { maxFeePerGas, maxPriorityFeePerGas, gasLimit: 2100000 }
    });

    const tx = await createFlowOperation.exec(signer);
    console.log(`tx: ${tx.hash}`);
    await tx.wait();
    console.log('stream created!');

    // NOTE: the sender is actually the sponsor, but a stream between the module and the receiver is also
    // created to pipe the funds
    console.log(`${SponsorModule} => ${user.address}`);
    data = await sf.cfaV1.getFlow({
      superToken: Superfluid.fUSDCx,
      sender: SponsorModule,
      receiver: user.address,
      providerOrSigner: lensHub.provider,
    });
    console.log(data);
  } catch (error) {
    console.error(error);
    process.exit(0);
  }

  // WIP -
  // assuming the above worked, we can now mirror
  console.log('lensHub.mirror()');
  const tx = await lensHub.connect(sponsor).mirror({
    profileId,
    profileIdPointed,
    pubIdPointed,
    referenceModule: ZERO_ADDRESS,
    referenceModuleData: []
  });
  await tx.wait();
  console.log(`tx: ${tx.hash}`);
  const newPubId = await lensHub.getPubCount(profileId);
  console.log(await lensHub.getPub(profileId, newPubId));
});
