// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;
pragma abicoder v2;

import {
  ISuperfluid,
  ISuperToken,
  ISuperApp,
  ISuperAgreement,
  SuperAppDefinitions
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";

import {
  IConstantFlowAgreementV1
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/IConstantFlowAgreementV1.sol";

import {
  SuperAppBase
} from "@superfluid-finance/ethereum-contracts/contracts/apps/SuperAppBase.sol";

/**
 * @title SuperReceiver
 *
 * @notice A SuperFluid super app to receive callback events on streams created between a sender and this contract, with
 * extra data expected in the `userData` (on stream created) to redirect the stream to the owner of a given token.
 * https://github.com/superfluid-finance/protocol-monorepo/blob/dev/examples/tradeable-cashflow/contracts/RedirectAll.sol
 */
contract SuperReceiver is SuperAppBase {
  bytes public constant SF_CFA_ID = "org.superfluid-finance.agreements.ConstantFlowAgreement.v1";

  ISuperfluid private _host; // host
  IConstantFlowAgreementV1 internal _cfa; // the stored constant flow agreement class address

  modifier onlyHost() {
    require(msg.sender == address(_host), "SuperReceiver: support only one host");
    _;
  }

  modifier onlyExpected(address agreementClass) {
    require(_isCFAv1(agreementClass), "SuperReceiver: only CFAv1 supported");
    _;
  }

  constructor(address host, address cfa) {
    require(host != address(0), "SuperReceiver:: host is zero address");

    _host = ISuperfluid(host);
    _cfa = cfa != address(0)
      ? IConstantFlowAgreementV1(cfa)
      : IConstantFlowAgreementV1(address(_host.getAgreementClass(keccak256(SF_CFA_ID))));

    uint256 configWord =
      SuperAppDefinitions.APP_LEVEL_FINAL |
      SuperAppDefinitions.BEFORE_AGREEMENT_CREATED_NOOP |
      SuperAppDefinitions.BEFORE_AGREEMENT_UPDATED_NOOP |
      SuperAppDefinitions.BEFORE_AGREEMENT_TERMINATED_NOOP;

    _host.registerApp(configWord);
  }

  /**
   * @dev to be overridden by SponsorModule to handle callback data
   */
  function _onFlowUpdated(
    uint256 profileId,
    uint256 publicationId,
    address sender,
    address receiver,
    int96 flowRate
    // bytes memory burnSig
  ) internal virtual {}

  /**
   * @dev to be overridden by SponsorModule to retrieve the owner of given profile with `tokenId`
   */
  function _getProfileOwner(uint256 tokenId) internal virtual returns (address) {}

  /**************************************************************************
   * SuperApp callbacks
   *************************************************************************/

  function afterAgreementCreated(
    ISuperToken _superToken,
    address _agreementClass,
    bytes32, // _agreementId,
    bytes calldata _agreementData,
    bytes calldata, // _cbdata,
    bytes calldata _ctx
  ) external override onlyExpected(_agreementClass) onlyHost returns (bytes memory newCtx) {
    return _updateOutflow(_superToken, _ctx, _agreementData);
  }

  function afterAgreementUpdated(
    ISuperToken _superToken,
    address _agreementClass,
    bytes32, //_agreementId,
    bytes calldata _agreementData,
    bytes calldata, //_cbdata,
    bytes calldata _ctx
  ) external override onlyExpected(_agreementClass) onlyHost returns (bytes memory newCtx) {
    return _updateOutflow(_superToken, _ctx, _agreementData);
  }

  function afterAgreementTerminated(
    ISuperToken _superToken,
    address _agreementClass,
    bytes32, //_agreementId,
    bytes calldata _agreementData,
    bytes calldata, //_cbdata,
    bytes calldata _ctx
  ) external override onlyHost returns(bytes memory newCtx) {
    // According to the app basic law, we should never revert in a termination callback
    if (!_isCFAv1(_agreementClass)) return _ctx;

    return _updateOutflow(_superToken, _ctx, _agreementData);
  }

  /**************************************************************************
   * Redirect Logic
   *************************************************************************/

  /**
   * If a new stream is opened, or an existing one is opened
   */
  function _updateOutflow(
    ISuperToken superToken,
    bytes calldata ctx,
    bytes calldata agreementData
  ) private returns (bytes memory newCtx) {
    newCtx = ctx;

    (address receiver, int96 outFlowRate, int96 inFlowRate) = _processInput(superToken, ctx, agreementData);

    if (inFlowRate == int96(0)) { // delete the existing stream
      (newCtx, ) = _host.callAgreementWithContext(
        _cfa,
        abi.encodeWithSelector(
          _cfa.deleteFlow.selector,
          superToken,
          address(this),
          receiver,
          new bytes(0) // placeholder
        ),
        "0x",
        newCtx
      );
    } else if (outFlowRate != int96(0)) { // updating an existing stream
      (newCtx, ) = _host.callAgreementWithContext(
        _cfa,
        abi.encodeWithSelector(
          _cfa.updateFlow.selector,
          superToken,
          receiver,
          inFlowRate,
          new bytes(0) // placeholder
        ),
        "0x",
        newCtx
      );
    } else { // if there is no existing outflow, then create new flow to equal inflow
      (newCtx, ) = _host.callAgreementWithContext(
        _cfa,
        abi.encodeWithSelector(
          _cfa.createFlow.selector,
          superToken,
          receiver,
          inFlowRate,
          new bytes(0) // placeholder
        ),
        "0x",
        newCtx
      );
    }
  }

  /**
   * @dev decode input data, validate the sender+receiver, and update storage data regarding the sponsorship
   * avoiding callstack too deep by passing in ctc/agreementData as memory
   */
  function _processInput(
    ISuperToken superToken,
    bytes memory ctx,
    bytes memory agreementData
  ) private returns (address receiver, int96 outFlowRate, int96 inFlowRate) {
    ISuperfluid.Context memory decompiledContext = _host.decodeCtx(ctx);
    int96 netFlowRate = _cfa.getNetFlow(superToken, address(this));
    (address sender, address _receiver) = abi.decode(agreementData, (address, address));

    uint256 profileId;
    uint256 publicationId;
    // bytes memory burnSig;

    if (decompiledContext.userData.length != 0) { // should be the case when a stream is being created/updated
      (profileId, publicationId) = abi.decode(decompiledContext.userData, (uint256, uint256));
      receiver = _getProfileOwner(profileId); // override with actual receiver being the profileId owner
    } else {
      receiver = _receiver; // sentinel or stream close via sf dashboard would not pass in `userData`
    }

    // sanity checks
    require(receiver != address(0), "SuperReceiver:: receiver is zero address");
    require(!ISuperfluid(_host).isApp(ISuperApp(receiver)), "SuperReceiver:: receiver is an app");
    require(sender != receiver, "SuperReceiver:: sender is the receiver");

    (,outFlowRate,,) = _cfa.getFlow(superToken, address(this), receiver); // CHECK: unclear what happens if flow doesn't exist.
    inFlowRate = netFlowRate + outFlowRate;

    // bubble up info to update storage in SponsorModule
    _onFlowUpdated(profileId, publicationId, sender, receiver, inFlowRate);

    return (receiver, outFlowRate, inFlowRate);
  }

  function _isCFAv1(address agreementClass) private view returns (bool) {
    return ISuperAgreement(agreementClass).agreementType() == keccak256(SF_CFA_ID);
  }
}
