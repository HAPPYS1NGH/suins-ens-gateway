import "server-only";

import { isValidSuiNSName, normalizeSuiNSName } from "@mysten/sui/utils";

import { suiClient } from "./client";

/**
 * The fields the gateway serves from SuiNS regardless of what Namespace holds
 * (`gateway/src/ccip-read/precedence.ts`). Read-only here for the same reason: a
 * value written through this app would never reach a resolver.
 */
export interface SuinsProfile {
  /** `addr(node, 784)`. SuiNS-only — never sourced from a Namespace record. */
  targetAddress: string | null;
  /** `text(node, "avatar")`. SuiNS wins; Namespace is only a fallback. */
  avatar: string | null;
  /** `text(node, "contentHash")` and `contenthash()`. */
  contentHash: string | null;
  /** `text(node, "walrusSiteId")` / `text(node, "walrus")`. */
  walrusSiteId: string | null;
}

const EMPTY: SuinsProfile = {
  targetAddress: null,
  avatar: null,
  contentHash: null,
  walrusSiteId: null,
};

/**
 * Reads the SuiNS-authoritative half of a name's records, mirroring what the gateway
 * resolves. `avatar` is stored as a Sui object ID, so it is resolved to that object's
 * display `image_url` — the same value the gateway returns for `text("avatar")`.
 *
 * Never throws: an unreachable fullnode yields empty fields rather than a failed page.
 * The Sui address is the one record here worth showing prominently, and it is missing
 * far more often than not — most names never set a target.
 */
export async function readSuinsProfile(name: string): Promise<SuinsProfile> {
  if (!isValidSuiNSName(name)) return EMPTY;
  const client = suiClient() as any;

  try {
    const record = await client.suins.getNameRecord(normalizeSuiNSName(name, "dot"));
    if (!record) return EMPTY;

    return {
      targetAddress: record.targetAddress || null,
      avatar: record.avatar ? await avatarImageUrl(client, record.avatar) : null,
      contentHash: record.contentHash || null,
      walrusSiteId: record.walrusSiteId || null,
    };
  } catch {
    return EMPTY;
  }
}

async function avatarImageUrl(client: any, objectId: string): Promise<string | null> {
  try {
    const { object } = await client.core.getObject({ objectId, include: { display: true } });
    return (object.display?.output as Record<string, string> | null)?.image_url ?? null;
  } catch {
    return null;
  }
}
