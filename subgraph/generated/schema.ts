// THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.

import {
  TypedMap,
  Entity,
  Value,
  ValueKind,
  store,
  Bytes,
  BigInt,
  BigDecimal
} from "@graphprotocol/graph-ts";

export class MadCreator extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));

    this.set("tags", Value.fromStringArray(new Array(0)));
  }

  save(): void {
    let id = this.get("id");
    assert(id != null, "Cannot save MadCreator entity without an ID");
    if (id) {
      assert(
        id.kind == ValueKind.STRING,
        `Entities of type MadCreator must have an ID of type String but the id '${id.displayData()}' is of type ${id.displayKind()}`
      );
      store.set("MadCreator", id.toString(), this);
    }
  }

  static load(id: string): MadCreator | null {
    return changetype<MadCreator | null>(store.get("MadCreator", id));
  }

  get id(): string {
    let value = this.get("id");
    return value!.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get publications(): Array<string> {
    let value = this.get("publications");
    return value!.toStringArray();
  }

  set publications(value: Array<string>) {
    this.set("publications", Value.fromStringArray(value));
  }

  get tags(): Array<string> {
    let value = this.get("tags");
    return value!.toStringArray();
  }

  set tags(value: Array<string>) {
    this.set("tags", Value.fromStringArray(value));
  }
}

export class MadPublication extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));

    this.set("referenceModule", Value.fromBytes(Bytes.empty()));
    this.set("profileId", Value.fromBigInt(BigInt.zero()));
    this.set("pubId", Value.fromBigInt(BigInt.zero()));
    this.set("superToken", Value.fromBytes(Bytes.empty()));
    this.set("flowRate", Value.fromBigInt(BigInt.zero()));
    this.set("minSeconds", Value.fromBigInt(BigInt.zero()));
    this.set("tag", Value.fromString(""));
    this.set("creator", Value.fromString(""));
    this.set("uri", Value.fromString(""));
  }

  save(): void {
    let id = this.get("id");
    assert(id != null, "Cannot save MadPublication entity without an ID");
    if (id) {
      assert(
        id.kind == ValueKind.STRING,
        `Entities of type MadPublication must have an ID of type String but the id '${id.displayData()}' is of type ${id.displayKind()}`
      );
      store.set("MadPublication", id.toString(), this);
    }
  }

  static load(id: string): MadPublication | null {
    return changetype<MadPublication | null>(store.get("MadPublication", id));
  }

  get id(): string {
    let value = this.get("id");
    return value!.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get referenceModule(): Bytes {
    let value = this.get("referenceModule");
    return value!.toBytes();
  }

  set referenceModule(value: Bytes) {
    this.set("referenceModule", Value.fromBytes(value));
  }

  get profileId(): BigInt {
    let value = this.get("profileId");
    return value!.toBigInt();
  }

  set profileId(value: BigInt) {
    this.set("profileId", Value.fromBigInt(value));
  }

  get pubId(): BigInt {
    let value = this.get("pubId");
    return value!.toBigInt();
  }

  set pubId(value: BigInt) {
    this.set("pubId", Value.fromBigInt(value));
  }

  get superToken(): Bytes {
    let value = this.get("superToken");
    return value!.toBytes();
  }

  set superToken(value: Bytes) {
    this.set("superToken", Value.fromBytes(value));
  }

  get flowRate(): BigInt {
    let value = this.get("flowRate");
    return value!.toBigInt();
  }

  set flowRate(value: BigInt) {
    this.set("flowRate", Value.fromBigInt(value));
  }

  get minSeconds(): BigInt {
    let value = this.get("minSeconds");
    return value!.toBigInt();
  }

  set minSeconds(value: BigInt) {
    this.set("minSeconds", Value.fromBigInt(value));
  }

  get tag(): string {
    let value = this.get("tag");
    return value!.toString();
  }

  set tag(value: string) {
    this.set("tag", Value.fromString(value));
  }

  get creator(): string {
    let value = this.get("creator");
    return value!.toString();
  }

  set creator(value: string) {
    this.set("creator", Value.fromString(value));
  }

  get uri(): string {
    let value = this.get("uri");
    return value!.toString();
  }

  set uri(value: string) {
    this.set("uri", Value.fromString(value));
  }

  get streams(): Array<string> {
    let value = this.get("streams");
    return value!.toStringArray();
  }

  set streams(value: Array<string>) {
    this.set("streams", Value.fromStringArray(value));
  }
}

export class MadStream extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));

    this.set("sender", Value.fromBytes(Bytes.empty()));
    this.set("receiver", Value.fromBytes(Bytes.empty()));
    this.set("profileId", Value.fromBigInt(BigInt.zero()));
    this.set("pubId", Value.fromBigInt(BigInt.zero()));
    this.set("flowRate", Value.fromBigInt(BigInt.zero()));
    this.set("madPub", Value.fromString(""));
    this.set("createdAt", Value.fromBigInt(BigInt.zero()));
  }

  save(): void {
    let id = this.get("id");
    assert(id != null, "Cannot save MadStream entity without an ID");
    if (id) {
      assert(
        id.kind == ValueKind.STRING,
        `Entities of type MadStream must have an ID of type String but the id '${id.displayData()}' is of type ${id.displayKind()}`
      );
      store.set("MadStream", id.toString(), this);
    }
  }

  static load(id: string): MadStream | null {
    return changetype<MadStream | null>(store.get("MadStream", id));
  }

  get id(): string {
    let value = this.get("id");
    return value!.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get sender(): Bytes {
    let value = this.get("sender");
    return value!.toBytes();
  }

  set sender(value: Bytes) {
    this.set("sender", Value.fromBytes(value));
  }

  get receiver(): Bytes {
    let value = this.get("receiver");
    return value!.toBytes();
  }

  set receiver(value: Bytes) {
    this.set("receiver", Value.fromBytes(value));
  }

  get profileId(): BigInt {
    let value = this.get("profileId");
    return value!.toBigInt();
  }

  set profileId(value: BigInt) {
    this.set("profileId", Value.fromBigInt(value));
  }

  get pubId(): BigInt {
    let value = this.get("pubId");
    return value!.toBigInt();
  }

  set pubId(value: BigInt) {
    this.set("pubId", Value.fromBigInt(value));
  }

  get flowRate(): BigInt {
    let value = this.get("flowRate");
    return value!.toBigInt();
  }

  set flowRate(value: BigInt) {
    this.set("flowRate", Value.fromBigInt(value));
  }

  get madPub(): string {
    let value = this.get("madPub");
    return value!.toString();
  }

  set madPub(value: string) {
    this.set("madPub", Value.fromString(value));
  }

  get sponsor(): string | null {
    let value = this.get("sponsor");
    if (!value || value.kind == ValueKind.NULL) {
      return null;
    } else {
      return value.toString();
    }
  }

  set sponsor(value: string | null) {
    if (!value) {
      this.unset("sponsor");
    } else {
      this.set("sponsor", Value.fromString(<string>value));
    }
  }

  get createdAt(): BigInt {
    let value = this.get("createdAt");
    return value!.toBigInt();
  }

  set createdAt(value: BigInt) {
    this.set("createdAt", Value.fromBigInt(value));
  }
}

export class MadSponsor extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id != null, "Cannot save MadSponsor entity without an ID");
    if (id) {
      assert(
        id.kind == ValueKind.STRING,
        `Entities of type MadSponsor must have an ID of type String but the id '${id.displayData()}' is of type ${id.displayKind()}`
      );
      store.set("MadSponsor", id.toString(), this);
    }
  }

  static load(id: string): MadSponsor | null {
    return changetype<MadSponsor | null>(store.get("MadSponsor", id));
  }

  get id(): string {
    let value = this.get("id");
    return value!.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get streams(): Array<string> {
    let value = this.get("streams");
    return value!.toStringArray();
  }

  set streams(value: Array<string>) {
    this.set("streams", Value.fromStringArray(value));
  }
}
