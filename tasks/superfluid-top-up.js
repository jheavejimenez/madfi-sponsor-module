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
task('superfluid-top-up', 'tops up the sponsor wallet with supertoken fUSDCx').setAction(async ({}, hre) => {
  const ethers = hre.ethers;
  const networkName = hre.network.name;
  const [_, governance, __, sponsor] = await ethers.getSigners(); // uses priv key defined in this hardhat config
  const { lensHub } = await _getLensHub(ethers, governance);

  console.log(`sponsor: ${sponsor.address}`);

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

  await token.mint(sponsor.address, '999999000000000000000000');
  token = await new ethers.Contract(Superfluid.fUSDC, ERC20ABI, sponsor); // approve from sponsor wallet
  await token.approve(superToken.address, '999999000000000000000000');

  const { maxFeePerGas, maxPriorityFeePerGas } = await ethers.provider.getFeeData();
  await superToken
    .upgrade({ amount: '999999000000000000000000', overrides: { maxFeePerGas, maxPriorityFeePerGas, gasLimit: 2100000 } })
    .exec(signer);
  console.log('sponsor wallet topped up with fUSDCx');
});
