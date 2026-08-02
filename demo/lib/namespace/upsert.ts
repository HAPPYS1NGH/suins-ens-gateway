import "server-only";

import {
  ChainName,
  getCoinType,
  SubnameAlreadyExistsError,
  type OffchainClient,
  type SubnameDTO,
} from "@thenamespace/offchain-manager";
import { isAxiosError } from "axios";
import { getAddress } from "viem";

import { env } from "@/lib/env";
import { checkNameOwnership, type NameOwnershipStatus } from "@/lib/suins/ownership";

import { namespaceClient } from "./client";

const PARENT_DOMAIN = "onsui.eth";
const NAMESPACE_APP_ID = "sui-name-holder-demo";
const NAMESPACE_SCHEMA_VERSION = "1";
const ETH_COIN_TYPE_KEY = String(getCoinType(ChainName.Ethereum));

export interface UpsertInput {
  /** Name as entered by the user; re-verified against `suiAddress` before any write. */
  suiName: string;
  suiAddress: string;
  ethereumAddress?: string;
}

export interface PublicProfile {
  fullName: string;
  ethereumAddress: string | null;
}

/** The wallet does not currently, directly, own this name's registration NFT. */
export class NameNotOwnedError extends Error {
  constructor(readonly status: NameOwnershipStatus) {
    super(`Wallet does not currently own this name (status: ${status})`);
    this.name = "NameNotOwnedError";
  }
}

/**
 * A Namespace record already exists at this label but was not created by this app for
 * this registration. Refuses to overwrite it rather than silently adopting it.
 */
export class NamespaceLabelCollisionError extends Error {
  constructor(fullName: string) {
    super(`${fullName} already exists with unrelated provenance`);
    this.name = "NamespaceLabelCollisionError";
  }
}

interface Provenance {
  app: string;
  schemaVersion: string;
  suiNetwork: string;
  suinsName: string;
  suinsNftId: string;
}

/** `happy.sui` -> { label: "happy", fullName: "happy.onsui.eth" }. */
function toEnsIdentity(normalizedSuiName: string): { label: string; fullName: string } {
  const label = normalizedSuiName.replace(/\.sui$/, "");
  return { label, fullName: `${label}.${PARENT_DOMAIN}` };
}

/** `happy.sui` -> `happy.onsui.eth`. Callers must pass an already-normalized name. */
export function toEnsFullName(normalizedSuiName: string): string {
  return toEnsIdentity(normalizedSuiName).fullName;
}

function buildProvenance(normalizedName: string, nftId: string): Provenance {
  return {
    app: NAMESPACE_APP_ID,
    schemaVersion: NAMESPACE_SCHEMA_VERSION,
    suiNetwork: env.SUI_NETWORK,
    suinsName: normalizedName,
    suinsNftId: nftId,
  };
}

function toMetadataRecords(provenance: Provenance) {
  return (Object.entries(provenance) as [keyof Provenance, string][]).map(
    ([key, value]) => ({ key, value }),
  );
}

function matchesProvenance(dto: SubnameDTO, provenance: Provenance): boolean {
  return (Object.keys(provenance) as (keyof Provenance)[]).every(
    (key) => dto.metadata[key] === provenance[key],
  );
}

function toAddressRecords(ethereumAddress: string | undefined) {
  return ethereumAddress
    ? [{ chain: ChainName.Ethereum, value: getAddress(ethereumAddress) }]
    : [];
}

/**
 * The SDK's own `getSingleSubname` is supposed to translate a 404 into `null`, but
 * its internal `err instanceof AxiosError` check is unreliable across Next.js's
 * bundled module graph — a raw AxiosError can still escape. `isAxiosError` is a
 * duck-typed check (`error.isAxiosError === true`), so it survives that boundary.
 */
async function getSubnameOrNull(
  client: OffchainClient,
  fullName: string,
): Promise<SubnameDTO | null> {
  try {
    return await client.getSingleSubname(fullName);
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

/**
 * Idempotent, conflict-safe create/update of `label.onsui.eth`. Rechecks direct NFT
 * ownership immediately before writing — a session or an earlier check is never
 * treated as permanent proof. Creates only when the label is absent; otherwise
 * requires every immutable provenance field to match before updating, so an update
 * can never silently take over a label this app did not create for this exact
 * registration. The Namespace `owner` field is intentionally never set.
 */
export async function upsertSubname(input: UpsertInput): Promise<void> {
  const ownership = await checkNameOwnership(input.suiName, input.suiAddress);
  if (ownership.status !== "owned") {
    throw new NameNotOwnedError(ownership.status);
  }

  const { label, fullName } = toEnsIdentity(ownership.normalizedName);
  const provenance = buildProvenance(ownership.normalizedName, ownership.nftId);
  const addresses = toAddressRecords(input.ethereumAddress);
  const client = namespaceClient();

  let current = await getSubnameOrNull(client, fullName);

  if (!current) {
    try {
      await client.createSubname({
        parentName: PARENT_DOMAIN,
        label,
        addresses,
        metadata: toMetadataRecords(provenance),
      });
      return;
    } catch (error) {
      if (!(error instanceof SubnameAlreadyExistsError)) throw error;
      // Someone else's create won the race; refetch and apply the same provenance
      // check as an existing record so this never silently adopts their label.
      current = await getSubnameOrNull(client, fullName);
      if (!current) throw error;
    }
  }

  if (!matchesProvenance(current, provenance)) {
    throw new NamespaceLabelCollisionError(fullName);
  }

  await client.updateSubname(fullName, { addresses });
}

/** Public read projection. Never returns the full `SubnameDTO`. */
export async function readProfile(fullName: string): Promise<PublicProfile | null> {
  const dto = await getSubnameOrNull(namespaceClient(), fullName);
  if (!dto) return null;

  return {
    fullName: dto.fullName,
    ethereumAddress: dto.addresses[ETH_COIN_TYPE_KEY] ?? null,
  };
}
