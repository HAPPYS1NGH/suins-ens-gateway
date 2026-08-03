import "server-only";

import {
  isValidSuiNSName,
  normalizeSuiAddress,
  normalizeSuiNSName,
} from "@mysten/sui/utils";

import { suiClient } from "./client";

export type NameOwnershipStatus = NameOwnershipResult["status"];

/** The name resolves to a registration NFT held by a plain address, right now. */
export interface OwnedName {
  status: "owned";
  normalizedName: string;
  nftId: string;
  /** Whoever currently holds the registration NFT — not necessarily the caller. */
  ownerAddress: string;
  expirationTimestampMs: number;
  checkedAt: string;
}

/** Every way a lookup can end without a single address-owned registration. */
interface UnownedName {
  status:
    | "not-found"
    | "expired"
    | "object-owned"
    | "shared"
    | "immutable"
    | "unsupported-owner"
    | "rpc-unavailable"
    | "invalid-name";
  /** `null` only when the input could not be normalized at all. */
  normalizedName: string | null;
  checkedAt: string;
}

/** {@link resolveNameOwner}: who holds the name, with no candidate to compare against. */
export type NameOwnerResult = OwnedName | UnownedName;

/** {@link checkNameOwnership}: the same, plus the "wrong wallet" verdict. */
export type NameOwnershipResult =
  | OwnedName
  | UnownedName
  | {
      status: "address-owner-mismatch";
      normalizedName: string;
      checkedAt: string;
    };

/**
 * The SuiNS SDK does not return `null` for a name nobody registered — the registry
 * lookup throws `Object <id> not found` for the absent record object. Without this
 * an unregistered name reads as `rpc-unavailable`, which tells a visitor Sui is down
 * and answers a write with a retryable 503 instead of a plain "you don't own this".
 *
 * Deliberately narrow, so it fails closed: a transport failure says `fetch failed`,
 * `ECONNREFUSED` or `deadline exceeded`, never "not found", and stays retryable.
 */
function isObjectNotFound(error: unknown): boolean {
  return error instanceof Error && /\bnot found\b/i.test(error.message);
}

/**
 * Answers "who directly holds this name's registration NFT, right now".
 *
 * A resolution target is not ownership, so this reads the record's `nftId` and that
 * object's current owner. Failure is classified rather than collapsed into a boolean:
 * an unreachable RPC is `rpc-unavailable`, never a missing name, so callers can fail
 * closed or retry instead of telling a holder their name does not exist.
 *
 * Public and requires no session — a profile page needs the holder of a name nobody
 * is signed in as. Authorization lives in {@link checkNameOwnership}, which layers a
 * single address comparison on top of this.
 */
export async function resolveNameOwner(name: string): Promise<NameOwnerResult> {
  const checkedAt = new Date().toISOString();

  if (!isValidSuiNSName(name)) {
    return { status: "invalid-name", normalizedName: null, checkedAt };
  }
  const normalizedName = normalizeSuiNSName(name, "dot");

  const client = suiClient();

  let nftId: string;
  let expirationTimestampMs: number;
  let owner: Awaited<
    ReturnType<typeof client.core.getObject>
  >["object"]["owner"];

  try {
    const record = await client.suins.getNameRecord(normalizedName);
    if (!record) {
      return { status: "not-found", normalizedName, checkedAt };
    }

    if (record.expirationTimestampMs <= Date.parse(checkedAt)) {
      return { status: "expired", normalizedName, checkedAt };
    }

    nftId = record.nftId;
    expirationTimestampMs = record.expirationTimestampMs;
    owner = (await client.core.getObject({ objectId: nftId })).object.owner;
  } catch (error) {
    if (isObjectNotFound(error)) {
      return { status: "not-found", normalizedName, checkedAt };
    }
    return { status: "rpc-unavailable", normalizedName, checkedAt };
  }

  switch (owner.$kind) {
    case "AddressOwner":
      return {
        status: "owned",
        normalizedName,
        nftId,
        ownerAddress: normalizeSuiAddress(owner.AddressOwner),
        expirationTimestampMs,
        checkedAt,
      };
    case "ObjectOwner":
      return { status: "object-owned", normalizedName, checkedAt };
    case "Shared":
      return { status: "shared", normalizedName, checkedAt };
    case "Immutable":
      return { status: "immutable", normalizedName, checkedAt };
    default:
      // Consensus-address and unrecognized owners are a definite answer we have no
      // authorization rule for, which is different from being unable to look it up.
      return { status: "unsupported-owner", normalizedName, checkedAt };
  }
}

/**
 * Answers "does *this* wallet directly hold this name's registration NFT, right now".
 *
 * The authorization gate for every write. `rpc-unavailable` is never collapsed into
 * `address-owner-mismatch`, so a caller that fails closed on an outage does not tell
 * the user they lost their name.
 */
export async function checkNameOwnership(
  name: string,
  suiAddress: string,
): Promise<NameOwnershipResult> {
  const result = await resolveNameOwner(name);
  if (result.status !== "owned") return result;

  if (result.ownerAddress !== normalizeSuiAddress(suiAddress)) {
    return {
      status: "address-owner-mismatch",
      normalizedName: result.normalizedName,
      checkedAt: result.checkedAt,
    };
  }
  return result;
}
