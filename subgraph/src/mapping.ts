import { BigInt, Address, store } from "@graphprotocol/graph-ts"
import {
  InitReferenceModule,
  MirrorCreated,
  MirrorStreamDeleted,
  MirrorStreamUpdated
} from "../generated/SponsorModule/SponsorModule"
import { MadPublication, MadCreator, MadSponsor, MadStream } from "../generated/schema"

function _accountId(account: Address): String {
  return `${account.toHexString().toLowerCase()}`;
}

function _madPubId(pubOwner: Address, pubId: BigInt): String {
  return `${_accountId(pubOwner)}/${pubId.toString()}`;
}

// since only one stream per 2 accounts can exist - reuse the id for MadStream and MadSponsor
function _madStreamId(madPubId: String, sender: Address): String {
  return `${madPubId}/${_accountId(sender)}`;
}

export function handleInitReferenceModule(event: InitReferenceModule): void {
  const entity = new MadPublication(_madPubId(event.params.account, event.params.pubId));

  entity.referenceModule = event.address;

  const creatorId = _accountId(event.params.account);
  let creator = MadCreator.load(creatorId);
  if (!creator) {
    creator = new MadCreator(creatorId);
    creator.tags = [event.params.tag];
    creator.save();
  } else {
    if (creator.tags.indexOf(event.params.tag) === -1) {
      creator.tags.push(event.params.tag);
    }
  }

  entity.creator = creatorId;
  entity.profileId = event.params.profileId;
  entity.pubId = event.params.pubId;
  entity.superToken = event.params.superToken;
  entity.flowRate = event.params.flowRate;
  entity.minSeconds = event.params.minSeconds;
  entity.tag = event.params.tag;
  entity.save();
}

export function handleMirrorStreamUpdated(event: MirrorStreamUpdated): void {
  const madPubId = _madPubId(event.params.receiver, event.params.pubId);
  const streamId = _madStreamId(madPubId, event.params.sender);

  let entity = MadStream.load(streamId);
  if (!entity) {
    entity = new MadStream(streamId);
    entity.sender = event.params.sender;
    entity.receiver = event.params.receiver;
    entity.madPub = madPubId;
  }

  entity.flowRate = event.params.flowRate;
  entity.save();
}

export function handleMirrorCreated(event: MirrorCreated): void {
  const streamId = _madStreamId(_madPubId(event.params.receiver, event.params.pubId), event.params.sponsor);
  const sponsorId = _accountId(event.params.sponsor);

  const stream = MadStream.load(streamId);

  if (stream) {
    let entity = MadSponsor.load(sponsorId);
    if (entity === null) {
      entity = new MadSponsor(sponsorId);
      entity.save();
    }

    stream.sponsor = sponsorId;
  }
}

export function handleMirrorStreamDeleted(event: MirrorStreamDeleted): void {
  const madPubId = _madPubId(event.params.receiver, event.params.pubId);
  store.remove('MadStream', _madStreamId(madPubId, event.params.sender));
}
