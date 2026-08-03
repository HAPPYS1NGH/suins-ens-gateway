import { ChainName, getCoinType } from "@thenamespace/offchain-manager";

/**
 * Record vocabulary shared by the server write path and the client UI.
 *
 * Deliberately free of `server-only` and of any Node import: `lib/namespace/schema.ts`,
 * `lib/namespace/upsert.ts`, the profile view and the record editor all read from here,
 * and these tables had drifted into four separate copies before.
 */

export const PARENT_DOMAIN = "onsui.eth";

/**
 * Keys the gateway always serves from SuiNS regardless of what Namespace holds
 * (`gateway/src/ccip-read/precedence.ts`). Accepting them would let a holder write a
 * value the gateway silently ignores, so both the API boundary and the editor reject
 * them outright rather than misleading the caller with an apparently successful save.
 */
export const RESERVED_TEXT_KEYS = new Set([
  "org.suins.name",
  "contentHash",
  "walrus",
  "walrusSiteId",
]);

/**
 * Coin types the gateway serves only from SuiNS. 784 is the name's own target
 * address: it is read from Sui and shown, never written from here.
 */
export const RESERVED_CHAINS = new Set<string>([ChainName.Sui]);

/**
 * Namespace stores address records keyed by ENSIP-11/SLIP-44 coin type ("60" for
 * Ethereum, "784" for Sui) but accepts updates keyed by `ChainName`, so every
 * read-back address is translated before it is merged, re-submitted, or rendered.
 */
const COIN_TO_CHAIN: Record<number, ChainName> = (() => {
  const map: Record<number, ChainName> = {};
  for (const chain of Object.values(ChainName)) {
    map[getCoinType(chain)] = chain;
  }
  return map;
})();

/** `undefined` for coin types this SDK version has no chain for; callers drop those. */
export function chainNameFromAddressKey(key: string): ChainName | undefined {
  if ((Object.values(ChainName) as string[]).includes(key)) return key as ChainName;
  return COIN_TO_CHAIN[Number(key)];
}

export const CHAIN_LABELS: Record<ChainName, string> = {
  [ChainName.Ethereum]: "Ethereum",
  [ChainName.Default]: "Default",
  [ChainName.Solana]: "Solana",
  [ChainName.Arbitrum]: "Arbitrum",
  [ChainName.Optimism]: "Optimism",
  [ChainName.Base]: "Base",
  [ChainName.Polygon]: "Polygon",
  [ChainName.Bsc]: "BNB Chain",
  [ChainName.Avalanche]: "Avalanche",
  [ChainName.Gnosis]: "Gnosis",
  [ChainName.Zksync]: "zkSync",
  [ChainName.Cosmos]: "Cosmos",
  [ChainName.Near]: "NEAR",
  [ChainName.Linea]: "Linea",
  [ChainName.Scroll]: "Scroll",
  [ChainName.Bitcoin]: "Bitcoin",
  [ChainName.Starknet]: "Starknet",
  [ChainName.Sui]: "Sui",
  [ChainName.Unichain]: "Unichain",
  [ChainName.Berachain]: "Berachain",
  [ChainName.WorldChain]: "World Chain",
  [ChainName.Zora]: "Zora",
  [ChainName.Celo]: "Celo",
  [ChainName.Aptos]: "Aptos",
  [ChainName.Algorand]: "Algorand",
  [ChainName.Monad]: "Monad",
  [ChainName.Push]: "Push",
  [ChainName.Polkadot]: "Polkadot",
  [ChainName.Vara]: "Vara",
};

/** Brand colour + monogram for the chain mark. Chains absent here fall back to a neutral tile. */
export const CHAIN_MARKS: Partial<Record<ChainName, { color: string; mark: string }>> = {
  [ChainName.Ethereum]: { color: "#627eea", mark: "Ξ" },
  [ChainName.Base]: { color: "#0052ff", mark: "B" },
  [ChainName.Arbitrum]: { color: "#12aaff", mark: "A" },
  [ChainName.Optimism]: { color: "#ff0420", mark: "OP" },
  [ChainName.Polygon]: { color: "#8247e5", mark: "P" },
  [ChainName.Bsc]: { color: "#f0b90b", mark: "BN" },
  [ChainName.Avalanche]: { color: "#e84142", mark: "AV" },
  [ChainName.Linea]: { color: "#61dfff", mark: "L" },
  [ChainName.Scroll]: { color: "#ebc28e", mark: "S" },
  [ChainName.Zksync]: { color: "#8c8dfc", mark: "ZK" },
  [ChainName.Solana]: { color: "#14f195", mark: "SO" },
  [ChainName.Bitcoin]: { color: "#f7931a", mark: "₿" },
  [ChainName.Sui]: { color: "#4da2ff", mark: "SU" },
  [ChainName.Default]: { color: "#8b5cf6", mark: "E" },
};

/**
 * Chains the profile always shows a row for, set or not. Anything else appears only
 * when set. Sui is absent by design — it is not a Namespace record, it is read from
 * SuiNS and rendered separately.
 */
export const DISPLAY_CHAINS: ChainName[] = [
  ChainName.Ethereum,
  ChainName.Base,
  ChainName.Arbitrum,
  ChainName.Optimism,
  ChainName.Polygon,
  ChainName.Solana,
  ChainName.Bitcoin,
];

export const POPULAR_CHAINS: ChainName[] = [
  ChainName.Ethereum,
  ChainName.Solana,
  ChainName.Bitcoin,
  ChainName.Base,
  ChainName.Polygon,
  ChainName.Arbitrum,
];

/** Every chain the editor offers. Reserved chains are never selectable. */
export const ORDERED_CHAINS: ChainName[] = [
  ...POPULAR_CHAINS,
  ...Object.values(ChainName)
    .filter((chain) => !POPULAR_CHAINS.includes(chain))
    .sort((a, b) => CHAIN_LABELS[a].localeCompare(CHAIN_LABELS[b])),
].filter((chain) => !RESERVED_CHAINS.has(chain));

export interface SocialText {
  key: string;
  label: string;
  /**
   * Builds an outbound link from a stored handle. Handles are `encodeURIComponent`'d
   * so a full URL pasted into a handle field cannot escape the intended origin.
   * `null` where no safe universal profile URL exists — the chip renders unlinked.
   */
  href: ((handle: string) => string) | null;
}

/** Text records rendered as chips in the identity block, in this order. */
export const SOCIAL_TEXTS: SocialText[] = [
  { key: "com.twitter", label: "X", href: (h) => `https://x.com/${encodeURIComponent(h)}` },
  {
    key: "com.github",
    label: "GitHub",
    href: (h) => `https://github.com/${encodeURIComponent(h)}`,
  },
  { key: "org.telegram", label: "Telegram", href: (h) => `https://t.me/${encodeURIComponent(h)}` },
  // Discord has no universal profile URL for a plain handle; show it, do not link it.
  { key: "com.discord", label: "Discord", href: null },
  {
    key: "xyz.farcaster",
    label: "Farcaster",
    href: (h) => `https://farcaster.xyz/${encodeURIComponent(h)}`,
  },
  {
    key: "com.linkedin",
    label: "LinkedIn",
    href: (h) => `https://linkedin.com/in/${encodeURIComponent(h)}`,
  },
  { key: "email", label: "Email", href: (h) => `mailto:${h}` },
];

/** Keys the identity block renders itself, so the chip row does not repeat them. */
export const IDENTITY_TEXT_KEYS = new Set([
  "description",
  "url",
  "avatar",
  "header",
  "name",
  ...SOCIAL_TEXTS.map((social) => social.key),
]);

/** Presets offered by the editor's key dropdown, a superset of the social chips. */
export const TEXT_KEY_PRESETS: { label: string; key: string }[] = [
  { label: "Description", key: "description" },
  { label: "Website", key: "url" },
  { label: "Twitter / X", key: "com.twitter" },
  { label: "GitHub", key: "com.github" },
  { label: "Telegram", key: "org.telegram" },
  { label: "Discord", key: "com.discord" },
  { label: "Farcaster", key: "xyz.farcaster" },
  { label: "LinkedIn", key: "com.linkedin" },
  { label: "Email", key: "email" },
  { label: "Avatar", key: "avatar" },
];

/** Strips a leading `@` for link building; storage keeps whatever the holder typed. */
export function cleanHandle(value: string): string {
  return value.trim().replace(/^@/, "");
}

export function truncateAddr(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

/** `alice.sui` / `alice` / `Alice.sui` → `alice`. */
export function labelOf(suiName: string): string {
  return suiName.trim().toLowerCase().replace(/\.sui$/, "");
}

export function toEnsName(suiName: string): string {
  return `${labelOf(suiName)}.${PARENT_DOMAIN}`;
}
