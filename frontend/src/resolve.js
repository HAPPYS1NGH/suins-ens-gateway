import { createPublicClient, fallback, getAddress, http } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";

import { ChainName, DISPLAY_CHAINS } from "./records.js";

// Read-only ENS resolution against mainnet. `{label}.onsui.eth` is served by the
// offchain SUINSResolver, which reverts with OffchainLookup (EIP-3668) to the
// Cloudflare gateway — viem follows it transparently. No wallet, no API key: the
// gateway aggregates SuiNS + Namespace server-side. Two public RPCs so a flaky
// or rate-limited one doesn't drop fields (CCIP-Read is one round-trip per field).
const publicClient = createPublicClient({
  chain: mainnet,
  transport: fallback([
    http("https://ethereum-rpc.publicnode.com"),
    http("https://eth.drpc.org"),
  ]),
});

// Coin type (SLIP-44 / ENSIP-11) → our ChainName display value. EVM L2s use their
// chain id as the coin type (Namespace convention); the gateway serves addr(coin)
// from Namespace for these and addr(784) from SuiNS.
const COIN_TO_CHAIN = {
  60: ChainName.Ethereum,
  8453: ChainName.Base,
  42161: ChainName.Arbitrum,
  10: ChainName.Optimism,
  137: ChainName.Polygon,
  501: ChainName.Solana,
  0: ChainName.Bitcoin,
  784: ChainName.Sui,
};

// Chains we resolve an address for, Sui first (its own row), then the display set.
const ADDRESS_CHAINS = [ChainName.Sui, ...DISPLAY_CHAINS];
const CHAIN_TO_COIN = Object.fromEntries(
  Object.entries(COIN_TO_CHAIN).map(([coin, chain]) => [chain, Number(coin)]),
);

// Identity/social text keys + a few common extras. ENS cannot enumerate text keys,
// so this is a fixed probe set; SuiNS-served keys (avatar/contentHash/walrus/
// org.suins.name) are pulled out separately and never reach the card's `texts`.
const TEXT_KEYS = [
  "description",
  "url",
  "com.twitter",
  "com.github",
  "org.telegram",
  "com.discord",
  "xyz.farcaster",
  "com.linkedin",
  "email",
  "location",
  "notice",
];

const isZero = (v) => !v || /^0x0*$/i.test(v);

/** Checksum EVM 20-byte addresses for display; pass through everything else. */
const display = (v) => (/^0x[a-fA-F0-9]{40}$/.test(v) ? getAddress(v) : v);

// Each field is its own CCIP-Read round-trip (RPC → gateway → SuiNS/Namespace).
// Free public RPCs throttle large fan-out, so cap concurrency and retry transient
// failures — a dropped field would otherwise render a half-empty profile.
const CONCURRENCY = 4;
const RETRIES = 2;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetry(fn) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= RETRIES) throw err;
      await sleep(150 * (attempt + 1));
    }
  }
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const i = cursor++;
        results[i] = await fn(items[i], i);
      }
    }),
  );
  return results;
}

/** `happysingh` / `happysingh.sui` / `HAPPYSINGH` → `happysingh`. */
function labelOf(input) {
  return input.trim().toLowerCase().replace(/^@/, "").replace(/\.sui$/, "").replace(/\.onsui\.eth$/, "");
}

/**
 * Resolve a read-only profile for a SuiNS name. Returns the same shape the demo's
 * server reads produced: `{ name, suins, profile }`. Throws on transport errors.
 */
export async function resolveProfile(rawInput) {
  const label = labelOf(rawInput);
  if (!label) throw new Error("Enter a name to resolve");
  const ensName = normalize(`${label}.onsui.eth`);

  // One round-trip per address + one per text key. The gateway does the SuiNS /
  // Namespace merge; viem decodes ENSIP-9 addresses back to display form.
  const addressEntries = await mapLimit(ADDRESS_CHAINS, CONCURRENCY, async (chain) => {
    try {
      const value = await withRetry(() =>
        publicClient.getEnsAddress({ name: ensName, coinType: CHAIN_TO_COIN[chain] }),
      );
      return isZero(value) ? null : [chain, display(value)];
    } catch {
      return null;
    }
  });

  const textKeys = [...TEXT_KEYS, "avatar", "contentHash", "walrusSiteId", "org.suins.name"];
  const textEntries = await mapLimit(textKeys, CONCURRENCY, async (key) => {
    try {
      const value = await withRetry(() => publicClient.getEnsText({ name: ensName, key }));
      return value ? [key, value] : null;
    } catch {
      return null;
    }
  });

  const textMap = Object.fromEntries(textEntries.filter(Boolean));

  const suiTarget = addressEntries.find((e) => e && e[0] === ChainName.Sui)?.[1] ?? null;
  // Sui's row is sourced separately; the card/AddressRecords render it via suins.
  const addresses = Object.fromEntries(addressEntries.filter((e) => e && e[0] !== ChainName.Sui));

  const name = textMap["org.suins.name"] || `${label}.sui`;
  const suins = {
    targetAddress: suiTarget,
    avatar: textMap.avatar || null,
    contentHash: textMap.contentHash || null,
    walrusSiteId: textMap.walrusSiteId || null,
  };

  const texts = {};
  for (const key of TEXT_KEYS) if (textMap[key]) texts[key] = textMap[key];

  const hasAny =
    suiTarget ||
    suins.avatar ||
    suins.contentHash ||
    suins.walrusSiteId ||
    Object.keys(addresses).length > 0 ||
    Object.keys(texts).length > 0;

  return { name, suins, profile: { texts, addresses }, notFound: !hasAny };
}