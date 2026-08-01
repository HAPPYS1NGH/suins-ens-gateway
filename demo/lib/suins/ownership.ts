import "server-only";

import {
  isValidSuiNSName,
  normalizeSuiAddress,
  normalizeSuiNSName,
} from "@mysten/sui/utils";

import { suiClient } from "./client";

export type NameOwnershipStatus = NameOwnershipResult["status"];

export type NameOwnershipResult =
  | {
      status: "owned";
      normalizedName: string;
      nftId: string;
      ownerAddress: string;
      expirationTimestampMs: number;
      checkedAt: string;
    }
  | {
      status:
        | "not-found"
        | "expired"
        | "address-owner-mismatch"
        | "object-owned"
        | "shared"
        | "immutable"
        | "unsupported-owner"
        | "rpc-unavailable"
        | "invalid-name";
      /** `null` only when the input could not be normalized at all. */
      normalizedName: string | null;
      checkedAt: string;
    };

/**
 * Answers "does this wallet directly hold this name's registration NFT, right now".
 *
 * A resolution target is not ownership, so this reads the record's `nftId` and that
 * object's current owner. Failure is classified rather than collapsed into a boolean:
 * an unreachable RPC is `rpc-unavailable`, never `address-owner-mismatch`, so callers
 * that gate mutations can fail closed without telling the user they lost their name.
 */
export async function checkNameOwnership(
  name: string,
  suiAddress: string,
): Promise<NameOwnershipResult> {
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
  } catch {
    return { status: "rpc-unavailable", normalizedName, checkedAt };
  }

  switch (owner.$kind) {
    case "AddressOwner": {
      const ownerAddress = normalizeSuiAddress(owner.AddressOwner);
      if (ownerAddress !== normalizeSuiAddress(suiAddress)) {
        return {
          status: "address-owner-mismatch",
          normalizedName,
          checkedAt,
        };
      }
      return {
        status: "owned",
        normalizedName,
        nftId,
        ownerAddress,
        expirationTimestampMs,
        checkedAt,
      };
    }
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
