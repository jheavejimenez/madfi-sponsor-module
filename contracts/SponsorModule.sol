// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.10;

import {IReferenceModule} from "lens-protocol/contracts/interfaces/IReferenceModule.sol";
import {ModuleBase} from "lens-protocol/contracts/core/modules/ModuleBase.sol";
import {Errors} from 'lens-protocol/contracts/libraries/Errors.sol';
import {FollowValidationModuleBase} from "lens-protocol/contracts/core/modules/FollowValidationModuleBase.sol";
import {ILensHub} from 'lens-protocol/contracts/interfaces/ILensHub.sol';
import {ILensNFTBase} from 'lens-protocol/contracts/interfaces/ILensNFTBase.sol';
import {DataTypes} from 'lens-protocol/contracts/libraries/DataTypes.sol';
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ISuperToken} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";
import {SuperReceiver} from "./superfluid/SuperReceiver.sol";
import {Int96SafeMath} from "./utils/Int96SafeMath.sol";
import "hardhat/console.sol";

/**
 * @title SponsorModule
 * @author carlosbeltran.eth
 *
 * @notice A 'Reference' Module that requires a money stream or 'sponsorship' to be created in order for a profile to
 * to mirror the publication of another profile.
 * - when processing a mirror, a money stream is created between the caller and the owner of the publication
 * - when a money stream is closed, the mirror should be burned (?)
 */
contract SponsorModule is IReferenceModule, FollowValidationModuleBase, SuperReceiver {
  using Int96SafeMath for int96;

  error StreamNotFound();
  error InsufficientMirrorFee();

  struct MirrorFee {
    address superToken; // accepted SuperToken (upgraded ERC20)
    int96 flowRate; // value per second
    int96 minSeconds; // minimum seconds the sponsorship should last
  }

  mapping (uint256 => mapping (uint256 => MirrorFee)) private mirrorFees; // profileId => pubId => fee data
  mapping (address => mapping (address => uint256)) private sponsorships; // sponsor => receiver => publicationIdPointed
  mapping (address => mapping (address => uint256)) private sponsorshipProfiles; // sponsor => receiver => sponsorProfileId
  mapping (address => mapping (uint256 => DataTypes.EIP712Signature)) private sponsorBurnSigs; // sponsor => publicationIdPointed => burn signature

  event InitReferenceModule(
    uint256 profileId,
    uint256 pubId,
    address account,
    address superToken,
    uint256 flowRate,
    uint256 minSeconds,
    string tag
  );
  event MirrorCreated(
    address sponsor,
    address receiver,
    uint256 profileId,
    uint256 pubId,
    uint256 profileIdPointed,
    uint256 pubIdPointed
  );
  event MirrorStreamUpdated(address sender, address receiver, uint256 pubId, uint256 flowRate);
  event MirrorStreamDeleted(address sender, address receiver, uint256 pubId);

  int96 private MIRROR_MIN_SECONDS = 3600; // 1hr

  constructor(address hub, address host, address cfa) ModuleBase(hub) SuperReceiver(host, cfa) {}

  /**
   * @dev The profile specifies requirements for a mirror
   * - accepted super token address
   * - flow rate per block (in wei) for a mirror; derived from a $/hour formula
   * - the minimum seconds a stream is to be open for
   */
  function initializeReferenceModule(uint256 profileId, uint256 pubId, bytes calldata data)
    external
    override
    returns (bytes memory)
  {
    (address _superToken, int96 _flowRate, int96 _minSeconds, string memory _tag) = abi.decode(data, (address, int96, int96, string));

    if (_superToken == address(0) || _flowRate == 0 || _minSeconds < MIRROR_MIN_SECONDS) {
      revert Errors.InitParamsInvalid();
    }

    mirrorFees[profileId][pubId] = MirrorFee({
      superToken: _superToken,
      flowRate: _flowRate,
      minSeconds: _minSeconds
    });

    emit InitReferenceModule(
      profileId,
      pubId,
      IERC721(HUB).ownerOf(profileId),
      _superToken,
      uint256(int256(_flowRate)),
      uint256(int256(_minSeconds)),
      _tag
    );

    return data;
  }

  /**
   * @notice Validate whether the sponsor has an open Superfluid stream with the publication owner
   */
  function processMirror(
    uint256 profileId,
    uint256 profileIdPointed,
    uint256 pubIdPointed
  ) external override {
    address sponsor = IERC721(HUB).ownerOf(profileId);
    address receiver = IERC721(HUB).ownerOf(profileIdPointed);

    console.log("sponsor is %s and receiver is %s", sponsor, receiver);

    _validateMirror(
      sponsor,
      receiver,
      mirrorFees[profileIdPointed][pubIdPointed]
    );

    uint256 nextPubId = ILensHub(HUB).getPubCount(profileId) + 1;

    emit MirrorCreated(sponsor, receiver, profileId, nextPubId, profileIdPointed, pubIdPointed);
  }

  /**
   * @notice Validates whether the sponsor has an open Superfluid stream with the publication owner
   */
  function processComment(
    uint256 profileId,
    uint256 profileIdPointed,
    uint256 pubIdPointed
  ) external override {
    address sponsor = _getProfileOwner(profileId);
    address receiver = _getProfileOwner(profileIdPointed);

    _validateMirror(
      sponsor,
      receiver,
      mirrorFees[profileIdPointed][pubIdPointed]
    );

    uint256 nextPubId = ILensHub(HUB).getPubCount(profileId) + 1;

    emit MirrorCreated(sponsor, receiver, profileId, nextPubId, profileIdPointed, pubIdPointed);
  }

  /**
   * @notice returns true/false whether the given account `mirrorOwner` and their publication `mirrorPubId` is valid
   * @dev a mirror becomes invalid whenever the Superfluid stream between the sponsor and the original publication owner
   * is closed for whatever reason (infuffient funds or explicit)
   * NOTE: ideally, if we had some control over the resulting publication NFT after #processMirror, we would burn the
   * NFT from #_onFlowUpdated
   */
  function isMirrorValid(uint256 sponsorProfileId, uint256 mirrorPubId) public view returns (bool) {
    (uint256 profileIdPointed, uint256 pubIdPointed) = ILensHub(HUB).getPubPointer(sponsorProfileId, mirrorPubId);

    if (profileIdPointed == 0 && pubIdPointed == 0) return false;

    address sponsor = _getProfileOwner(sponsorProfileId);
    address receiver = _getProfileOwner(profileIdPointed);

    return sponsorships[sponsor][receiver] != 0;
  }

  /**
   * @dev performs the necessary checks before a mirror is allowed
   * - is there an ongoing stream between the sponsor and the publication owner ?
   * - does the sponsor have enough balance of `fee.superToken` to cover the minimum timeframe ?
   */
  function _validateMirror(address sponsor, address pubOwner, MirrorFee storage fee) internal view {
    if (sponsorships[sponsor][pubOwner] == 0) {
      revert StreamNotFound();
    }

    (,int96 flowRate,,) = _cfa.getFlow(ISuperToken(fee.superToken), address(this), pubOwner);

    // @TODO: if conditions are not met - should we cancel the stream for the sponsor?
    if (!_checkAboveThreshold(fee, flowRate, sponsor)) {
      revert InsufficientMirrorFee();
    }
  }

  /**
   * @dev Callback for when we receive a stream update
   * @param publicationId the publication to be mirrored
   * @param sender the account that triggered the change
   * @param receiver the account to receive the stream (the publication owner)
   * @param flowRate the new stream flow rate (see SponsorReceiver.sol)
   * @param burnSig the signature from sponsor so we can update the post with empty contentURI once the sponsorship ends
   */
  function _onFlowUpdated(
    uint256 profileIdPointed,
    uint256 publicationId,
    uint256 profileId,
    address sender,
    address receiver,
    int96 flowRate,
    bytes calldata burnSig
  ) internal override {
    // in the case that we were unable to decode from `userData` - it should be in storage already
    if (publicationId == 0) {
      publicationId = sponsorships[sender][receiver];
      profileId = sponsorshipProfiles[sender][receiver];
    }

    console.log("_onFlowUpdated");
    console.log("profileIdPointed: %i", profileIdPointed);
    console.log("publicationId: %i", publicationId);
    console.log("profileId: %i", profileId);
    console.log("sender: %s", sender);

    // sanity check
    require(receiver == _getProfileOwner(profileIdPointed), "SponsorModule:: receiver is not the owner of profileIdPointed");

    if (flowRate == int96(0)) {
      ILensHub(HUB).updatePostWithSig(profileId, publicationId, sponsorBurnSigs[sender][publicationId]);
      console.log("burned!");

      delete sponsorships[sender][receiver];
      delete sponsorshipProfiles[sender][receiver];
      delete sponsorBurnSigs[sender][publicationId];

      emit MirrorStreamDeleted(sender, receiver, publicationId);
    } else {
      sponsorships[sender][receiver] = publicationId;
      sponsorshipProfiles[sender][receiver] = profileId;

      (uint8 v, bytes32 r, bytes32 s, uint256 deadline) = abi.decode(burnSig, (uint8, bytes32, bytes32, uint256));

      sponsorBurnSigs[sender][publicationId] = DataTypes.EIP712Signature({
        v: v,
        r: r,
        s: s,
        deadline: deadline
      });

      emit MirrorStreamUpdated(sender, receiver, publicationId, uint256(int256(flowRate)));
    }
  }

  /**
   * @dev if you look at LensHub#createProfile, it actually mints a token for the profile
   */
  function _getProfileOwner(uint256 tokenId) internal override view returns (address) {
    return IERC721(HUB).ownerOf(tokenId);
  }

  /**
   * @dev check that the stream `flowRate` meets the minimum set as the mirror fee. also make sure there is enough
   * balance to be spent for the mirror fee `minSeconds`
   * @param fee The mirror fee set by the publication owner
   * @param flowRate The flow rate for the stream created by the `sponsor`
   * @param sponsor The account attempting to mirror
   */
  function _checkAboveThreshold(MirrorFee storage fee, int96 flowRate, address sponsor) internal view returns (bool) {
    console.log("_checkAboveThreshold");
    console.log("flowRate is %i and fee is %i", uint256(int256(flowRate)), uint256(int256(fee.flowRate)));
    if (flowRate < fee.flowRate) return false;

    uint256 committedBalance = IERC20(fee.superToken).balanceOf(sponsor);
    console.log("committed balance is %s", committedBalance);

    return committedBalance >= uint256(int256(fee.flowRate.mul(fee.minSeconds, "SponsorModule:: invalid math")));
  }
}
