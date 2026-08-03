import "server-only";

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { mainPackage } from "@mysten/suins";

import { env } from "@/lib/env";

import { suiClient } from "./client";

export interface OwnedSuiName {
  /** The SuiNS name, e.g. `happy.sui`. */
  name: string;
  /** Object ID of the SuiNS registration NFT. */
  nftId: string;
  /** SuiNS `data.avatar`, if the owner set one on-chain. */
  avatar: string | null;
  /** SuiNS NFT display image_url (generated NFT art). */
  imageUrl: string | null;
  /** SuiNS target address for the name, if set. */
  targetAddress: string | null;
  /** Registration expiration in milliseconds since epoch. */
  expirationTimestampMs: number;
}

interface DisplayOutput {
  name?: string;
  image_url?: string;
  [key: string]: unknown;
}

interface OwnedObject {
  objectId: string;
  type?: string;
  display: { output?: DisplayOutput; errors?: unknown } | null;
}

type SupportedNetwork = "mainnet" | "testnet";

const SUPPORTED_NETWORKS = new Set<SupportedNetwork>(["mainnet", "testnet"]);

function isSupportedNetwork(network: string): network is SupportedNetwork {
  return (SUPPORTED_NETWORKS as Set<string>).has(network);
}

function registrationType() {
  const network = env.SUI_NETWORK;
  if (!isSupportedNetwork(network)) {
    throw new Error(`SuiNS name listing is not supported on ${network}`);
  }
  const packageIdV1 = mainPackage[network].packageIdV1;
  return `${packageIdV1}::suins_registration::SuinsRegistration`;
}

/**
 * Lists every SuiNS registration NFT held directly by `suiAddress` and resolves
 * each one to its on-chain name record. Names whose display or record cannot be
 * read are skipped rather than blocking the whole list.
 */
export async function listOwnedSuiNames(
  suiAddress: string,
): Promise<OwnedSuiName[]> {
  const owner = normalizeSuiAddress(suiAddress);
  const client = suiClient() as any;
  const type = registrationType();

  const result: { objects?: unknown[] } = await client.core.listOwnedObjects({
    owner,
    type,
    include: { display: true },
    limit: 100,
  });

  const objects = ((result.objects ?? []) as OwnedObject[]).filter(
    (object) => object.type === type,
  );

  const names = await Promise.all(
    objects.map(async (object) => {
      const display = (object.display?.output ?? undefined) as DisplayOutput | undefined;
      const name = display?.name;
      const imageUrl = display?.image_url ?? null;
      if (!name || !name.endsWith(".sui")) return null;

      try {
        const record = (await client.suins.getNameRecord(name)) as {
          name: string;
          avatar?: string;
          targetAddress?: string | null;
          expirationTimestampMs: number;
        } | null;
        if (!record) return null;
        return {
          name: record.name,
          nftId: object.objectId,
          avatar: record.avatar ?? null,
          imageUrl,
          targetAddress: record.targetAddress || null,
          expirationTimestampMs: record.expirationTimestampMs,
        } satisfies OwnedSuiName;
      } catch {
        // A single unreachable or malformed record should not hide the rest.
        return null;
      }
    }),
  );

  return names
    .filter((entry): entry is OwnedSuiName => entry !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}
