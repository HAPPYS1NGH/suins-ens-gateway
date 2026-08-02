import "server-only";

import { createPublicClient, decodeFunctionResult, encodeFunctionData, http, toHex } from "viem";
import { mainnet } from "viem/chains";
import { getEnsAddress, getEnsText, namehash, normalize, packetToBytes } from "viem/ens";

import { env } from "@/lib/env";

/** SUI coin type per SLIP-44 / ENSIP-9 (`gateway/src/ccip-read/precedence.ts`). */
const SUI_COIN_TYPE = BigInt(784);

/**
 * viem's internal sentinel for "use the client's own batched CCIP-Read handling
 * instead of a network gateway" — the same default `getEnsText`/`getEnsAddress` pass
 * when a caller does not supply `gatewayUrls`. Not exported publicly, so it is
 * reproduced here verbatim.
 */
const LOCAL_BATCH_GATEWAY_URL = "x-batch-gateway:true";

/** Mirrors viem's internal `universalResolverResolveAbi` (not part of its public API). */
const universalResolverResolveAbi = [
  {
    name: "resolveWithGateways",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "name", type: "bytes" },
      { name: "data", type: "bytes" },
      { name: "gateways", type: "string[]" },
    ],
    outputs: [
      { name: "", type: "bytes" },
      { name: "address", type: "address" },
    ],
  },
] as const;

const contenthashResolverAbi = [
  {
    name: "contenthash",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "bytes" }],
  },
] as const;

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(env.MAINNET_RPC_URL),
});

export type PreviewStatus = "resolved" | "empty" | "error";

export interface PreviewRecord {
  status: PreviewStatus;
  value: string | null;
  /** Present only when `status === "error"`; safe to show, never a raw exception. */
  error?: string;
}

export interface RecordPreview {
  ensName: string;
  resolvedAt: string;
  ethAddress: PreviewRecord;
  suiAddress: PreviewRecord;
  texts: Record<string, PreviewRecord>;
  contenthash: PreviewRecord;
}

export interface PreviewRequest {
  /** Full `.onsui.eth` name, e.g. `happy.onsui.eth`. */
  ensName: string;
  /** Text keys to resolve alongside the address and contenthash records. */
  textKeys: string[];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Resolution failed";
}

function toPreviewRecord(result: PromiseSettledResult<string | null>): PreviewRecord {
  if (result.status === "rejected") {
    return { status: "error", value: null, error: errorMessage(result.reason) };
  }
  return result.value === null
    ? { status: "empty", value: null }
    : { status: "resolved", value: result.value };
}

/**
 * Resolves ENSIP-7 `contenthash(node)` through the real Universal Resolver, so a
 * saved CID comes back the same way a browser's ENS library would see it — including
 * the resolver's own EIP-3668 `OffchainLookup` round trip, which viem's `readContract`
 * already follows transparently.
 */
async function resolveContenthash(normalizedName: string): Promise<string | null> {
  const universalResolverAddress = mainnet.contracts.ensUniversalResolver.address;
  const innerCalldata = encodeFunctionData({
    abi: contenthashResolverAbi,
    functionName: "contenthash",
    args: [namehash(normalizedName)],
  });

  const [result] = await publicClient.readContract({
    address: universalResolverAddress,
    abi: universalResolverResolveAbi,
    functionName: "resolveWithGateways",
    args: [toHex(packetToBytes(normalizedName)), innerCalldata, [LOCAL_BATCH_GATEWAY_URL]],
  });

  if (result === "0x") return null;
  const decoded = decodeFunctionResult({
    abi: contenthashResolverAbi,
    functionName: "contenthash",
    data: result,
  });
  return decoded && decoded !== "0x" ? decoded : null;
}

/**
 * Reads the live, publicly resolvable view of a `.onsui.eth` name — the address,
 * `addr(node, 784)`, requested text keys, and contenthash — through the same
 * ENS + CCIP-Read path a browser uses. Every record resolves independently via
 * `Promise.allSettled`; one failing record never discards the others
 * (`frontend/src/main.js:73`).
 */
export async function previewResolution(request: PreviewRequest): Promise<RecordPreview> {
  const normalizedName = normalize(request.ensName);

  const [ethAddress, suiAddress, contenthash, ...textResults] = await Promise.allSettled([
    getEnsAddress(publicClient, { name: normalizedName }),
    getEnsAddress(publicClient, { name: normalizedName, coinType: SUI_COIN_TYPE }),
    resolveContenthash(normalizedName),
    ...request.textKeys.map((key) => getEnsText(publicClient, { name: normalizedName, key })),
  ]);

  const texts: Record<string, PreviewRecord> = {};
  request.textKeys.forEach((key, index) => {
    texts[key] = toPreviewRecord(textResults[index]);
  });

  return {
    ensName: normalizedName,
    resolvedAt: new Date().toISOString(),
    ethAddress: toPreviewRecord(ethAddress),
    suiAddress: toPreviewRecord(suiAddress),
    texts,
    contenthash: toPreviewRecord(contenthash),
  };
}
