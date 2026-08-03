// Minimal JS port of demo/lib/records.ts — only the tables the read-only profile UI
// reads. ChainName is an inline string union here, so the @thenamespace/offchain-manager
// dependency is not pulled in just for an enum.

export const PARENT_DOMAIN = "onsui.eth";

export const ChainName = {
  Ethereum: "Ethereum",
  Default: "Default",
  Solana: "Solana",
  Arbitrum: "Arbitrum",
  Optimism: "Optimism",
  Base: "Base",
  Polygon: "Polygon",
  Bsc: "BSC",
  Avalanche: "Avalanche",
  Gnosis: "Gnosis",
  Zksync: "zkSync",
  Cosmos: "Cosmos",
  Near: "NEAR",
  Linea: "Linea",
  Scroll: "Scroll",
  Bitcoin: "Bitcoin",
  Starknet: "Starknet",
  Sui: "Sui",
  Unichain: "Unichain",
  Berachain: "Berachain",
  WorldChain: "WorldChain",
  Zora: "Zora",
  Celo: "Celo",
  Aptos: "Aptos",
  Algorand: "Algorand",
  Monad: "Monad",
  Push: "Push",
  Polkadot: "Polkadot",
  Vara: "Vara",
};

export const CHAIN_LABELS = {
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

export const CHAIN_MARKS = {
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

export const DISPLAY_CHAINS = [
  ChainName.Ethereum,
  ChainName.Base,
  ChainName.Arbitrum,
  ChainName.Optimism,
  ChainName.Polygon,
  ChainName.Solana,
  ChainName.Bitcoin,
];

export const RESERVED_CHAINS = new Set([ChainName.Sui]);

const CHAIN_VALUES = Object.values(ChainName);

/** Accepts a ChainName string key directly (how the static data keys addresses). */
export function chainNameFromAddressKey(key) {
  if (CHAIN_VALUES.includes(key)) return key;
  return undefined;
}

export const SOCIAL_TEXTS = [
  { key: "com.twitter", label: "X", href: (h) => `https://x.com/${encodeURIComponent(h)}` },
  { key: "com.github", label: "GitHub", href: (h) => `https://github.com/${encodeURIComponent(h)}` },
  { key: "org.telegram", label: "Telegram", href: (h) => `https://t.me/${encodeURIComponent(h)}` },
  { key: "com.discord", label: "Discord", href: null },
  { key: "xyz.farcaster", label: "Farcaster", href: (h) => `https://farcaster.xyz/${encodeURIComponent(h)}` },
  { key: "com.linkedin", label: "LinkedIn", href: (h) => `https://linkedin.com/in/${encodeURIComponent(h)}` },
  { key: "email", label: "Email", href: (h) => `mailto:${h}` },
];

export const IDENTITY_TEXT_KEYS = new Set([
  "description",
  "url",
  "avatar",
  "header",
  "name",
  ...SOCIAL_TEXTS.map((social) => social.key),
]);

export function cleanHandle(value) {
  return value.trim().replace(/^@/, "");
}

export function truncateAddr(address) {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

export function labelOf(suiName) {
  return suiName.trim().toLowerCase().replace(/\.sui$/, "");
}

export function toEnsName(suiName) {
  return `${labelOf(suiName)}.${PARENT_DOMAIN}`;
}