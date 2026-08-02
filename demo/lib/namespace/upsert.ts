import "server-only";

import {
  SubnameAlreadyExistsError,
  type ChainName,
  type OffchainClient,
  type SubnameDTO,
} from "@thenamespace/offchain-manager";
import { isAxiosError } from "axios";
import { getAddress } from "viem";

import { env } from "@/lib/env";
import type { MultichainAddressInput, TextRecordInput } from "@/lib/namespace/schema";
import { checkNameOwnership, type NameOwnershipStatus } from "@/lib/suins/ownership";

import { namespaceClient } from "./client";

const PARENT_DOMAIN = "onsui.eth";
const NAMESPACE_APP_ID = "sui-name-holder-demo";
const NAMESPACE_SCHEMA_VERSION = "1";

export interface UpsertInput {
  /** Name as entered by the user; re-verified against `suiAddress` before any write. */
  suiName: string;
  suiAddress: string;
  addresses?: MultichainAddressInput[];
  texts?: TextRecordInput[];
  contenthash?: string;
}

export interface PublicProfile {
  fullName: string;
  addresses: Record<string, string>;
  texts: Record<string, string>;
  contenthash: string | null;
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

/**
 * Checksums Ethereum-format addresses; every other chain's address format is
 * preserved exactly as the (already-validated) caller supplied it.
 */
function toAddressRecords(addresses: MultichainAddressInput[] | undefined) {
  return (addresses ?? []).map(({ chain, value }) => {
    try {
      return { chain: chain as ChainName, value: getAddress(value) };
    } catch {
      return { chain: chain as ChainName, value };
    }
  });
}

function toTextRecords(texts: TextRecordInput[] | undefined) {
  return (texts ?? []).map(({ key, value }) => ({ key, value }));
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
 *
 * Every write is a complete desired-state write: `addresses`/`texts`/`contenthash`
 * replace whatever Namespace currently holds for this label, they are never merged
 * field-by-field, so a removed row in the editor is actually removed here too.
 */
export async function upsertSubname(input: UpsertInput): Promise<void> {
  const ownership = await checkNameOwnership(input.suiName, input.suiAddress);
  if (ownership.status !== "owned") {
    throw new NameNotOwnedError(ownership.status);
  }

  const { label, fullName } = toEnsIdentity(ownership.normalizedName);
  const provenance = buildProvenance(ownership.normalizedName, ownership.nftId);
  const addresses = toAddressRecords(input.addresses);
  const texts = toTextRecords(input.texts);
  const contenthash = input.contenthash;
  const client = namespaceClient();

  let current = await getSubnameOrNull(client, fullName);

  if (!current) {
    try {
      await client.createSubname({
        parentName: PARENT_DOMAIN,
        label,
        addresses,
        texts,
        contenthash,
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

  // `updateSubname`'s `metadata` field replaces whatever is stored, it is never
  // merged — omitting it risks the API clearing provenance on the next update, which
  // would then permanently fail every future write for this label as a collision.
  await client.updateSubname(fullName, {
    addresses,
    texts,
    contenthash,
    metadata: toMetadataRecords(provenance),
  });
}

/** Public read projection. Never returns the full `SubnameDTO`. */
export async function readProfile(fullName: string): Promise<PublicProfile | null> {
  const dto = await getSubnameOrNull(namespaceClient(), fullName);
  if (!dto) return null;

  return {
    fullName: dto.fullName,
    addresses: dto.addresses,
    texts: dto.texts,
    contenthash: dto.contenthash ?? null,
  };
}
