# SUINS x ENS Bridge

Look up any [Sui Name Service (SUINS)](https://suins.io) name through [ENS](https://ens.domains). SuiNS is the source of truth for Sui-native fields; name holders layer extra records (other-chain addresses, text) on top via [Namespace](https://namespace.tech).

**Live app**: [suins-ens-gateway.vercel.app](https://suins-ens-gateway.vercel.app/)

Query `happysingh.onsui.eth` and get back `happysingh.sui` data from SUINS: address, avatar, IPFS content hash.

**Live on Ethereum Mainnet** | [SUINSResolver on Etherscan](https://etherscan.io/address/0x7974AF8BD3AEe4fe9f8833361fBc3249E3b23aB3#code) | [Gateway](https://suins-ens-gateway.happys1ngh.workers.dev/health)

## Try it

Any `.sui` name works through `onsui.eth`:

```
happysingh.onsui.eth  →  happysingh.sui
evan.onsui.eth        →  evan.sui
nick.onsui.eth        →  nick.sui
```

Website hosting works too. Set an IPFS CID as content hash on your `.sui` name and access it via:
- SuiNS: `https://happysingh.sui.id`
- ENS: `https://happysingh.onsui.eth.limo`

### `happysingh.onsui.eth`

| Record | Value |
|--------|-------|
| SUI Address (coin 784) | `0x556a3c6c150709c0a8486e3eb002ea8118ba79bdf349e710dc3bb85901f797c3` |
| Content Hash | `ipfs://bafybeiduzhsil3avfyxuy54pl4hpe7liq7yzft24d3dkigbeol7quwrk7u` |
| text("org.suins.name") | `happysingh.sui` |

### `evan.onsui.eth`

| Record | Value |
|--------|-------|
| SUI Address (coin 784) | `0x11086a8f83c5b11c101509662474f02549aee68a3d91d60970d91c1b480d5dae` |
| Avatar | `https://img.sm.xyz/0x93835f02ddb5d19f111d6c3da5c0cccc095d0848cd25e555ac39755cdda3d4a7/` |
| text("org.suins.name") | `evan.sui` |

## Quick start

```bash
npm install viem
```

```typescript
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";

// SUI coinType from SLIP-0044
const SUI_COIN_TYPE = 784;

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

async function fetchSuiAddress(ensName) {
  console.log(`Resolving SUI address for: ${ensName}`);
  console.log(`Using coinType: ${SUI_COIN_TYPE} (SUI - SLIP-0044)\n`);

  const suiAddress = await publicClient.getEnsAddress({
    name: normalize(ensName),
    coinType: SUI_COIN_TYPE,
  });

  if (suiAddress) {
    console.log(`ENS Name   : ${ensName}`);
    console.log(`SUI Address: ${suiAddress}`);
  } else {
    console.log(`No SUI address found for ${ensName}`);
  }

  return suiAddress;
}

fetchSuiAddress("happysingh.onsui.eth");
// → 0x556a3c6c150709c0a8486e3eb002ea8118ba79bdf349e710dc3bb85901f797c3
```

More examples in [`examples/`](./examples).

## How it works

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────┐     ┌───────────┐
│  ENS Client  │────▶│  SUINSResolver   │────▶│   Gateway   │────▶│   SUINS   │
│  (viem, etc) │     │  (Ethereum L1)   │     │ (CF Worker) │────▶│ (Sui L1)  │
└──────────────┘     └──────────────────┘     └─────────────┘     └───────────┘
                                                       │
                                                       └────▶┌────────────┐
                                                             │ Namespace  │
                                                             │ (offchain) │
                                                             └────────────┘
```

1. User queries `happysingh.onsui.eth` through any ENS client (viem, ethers, etc.)
2. SUINSResolver on Ethereum reverts with `OffchainLookup` ([EIP-3668](https://eips.ethereum.org/EIPS/eip-3668)), which tells the client to call the gateway
3. Gateway strips `onsui.eth` and resolves `happysingh.sui` from **SuiNS** and the matching **Namespace** record in parallel
4. Gateway picks one value per field under a fixed precedence policy, signs the response, and returns it
5. SUINSResolver verifies the signature on-chain and returns the data

There is no gateway-side database. SuiNS is the source of truth for Sui-native fields; Namespace holds the records name holders add on top (other-chain addresses, arbitrary text).

## What you can query

The gateway reads **two sources** and picks one value per field under a fixed precedence policy (see [ARCHITECTURE](ARCHITECTURE.md#record-precedence)):

- **SuiNS** — the canonical on-chain `.sui` name record.
- **[Namespace](https://namespace.tech)** — an offchain record store the demo writes to via `@thenamespace/offchain-manager`. Lets a name holder add records SuiNS doesn't have (other-chain addresses, arbitrary text keys).

| ENS Query | Source | Notes |
|-----------|--------|-------|
| `addr(784)` | SuiNS only | SUI address ([SLIP-44](https://github.com/nichanank/slip-0044) coin type 784). Cannot be overridden. |
| `addr(60)` / other coin types | Namespace | Multi-chain addresses, ENSIP-9 encoded. EVM L2 chain IDs are remapped to ENSIP-11 coin types (`0x80000000 \| chainId`). |
| `contenthash()` | SuiNS, fallback Namespace | IPFS CID → ENSIP-7 encoded (`0xe301` + CIDv1 bytes) |
| `text("avatar")` | SuiNS, fallback Namespace | SuiNS avatar: Sui NFT object → `display.image_url` |
| `text("contentHash")` / `text("walrusSiteId")` / `text("walrus")` | SuiNS only | `walrusSiteId` = Walrus Site object ID on Sui |
| `text("org.suins.name")` | derived | The original `.sui` name |
| `text(<any other key>)` | Namespace | Arbitrary text records set by the name holder |

### Content hash encoding

SUINS stores raw IPFS CID strings (e.g. `bafybei...`). The gateway converts them to [ENSIP-7](https://docs.ens.domains/ensip/7) binary format so ENS clients and [eth.limo](https://eth.limo) can resolve the content:

```
SUINS: "bafybeiduzhsil3avfyxuy54pl4hpe7liq7yzft24d3dkigbeol7quwrk7u"
  ↓ parse CID (CIDv0 auto-converted to CIDv1)
  ↓ prefix with 0xe301 (ipfs-ns multicodec)
ENS:  0xe3010170122074c9e485ec152e2f4c778f5f0ef27d6887f192cf5c1ec6a4182472ff0a5a2afd
```

Both CIDv0 (`Qm...`) and CIDv1 (`bafy...`) are supported.

### Avatar resolution

SUINS stores avatar as a Sui object ID, not a URL. The gateway looks up the object on-chain and pulls the image URL from its Display metadata:

```
SUINS: "0x93835f02ddb5d19f111d6c3da5c0cccc095d0848cd25e555ac39755cdda3d4a7"
  ↓ suiClient.getObject({ showDisplay: true })
  ↓ extract display.data.image_url
ENS:  "https://img.sm.xyz/0x93835f02ddb5d19f111d6c3da5c0cccc095d0848cd25e555ac39755cdda3d4a7/"
```

## Project structure

```
├── demo/                      # Wallet-first demo app (Next.js + viem)
│   ├── app/                    # Pages + API routes
│   │   ├── page.tsx            # Hero (signed out) / name workspace (signed in)
│   │   ├── [name]/page.tsx     # Public profile: ENS records for {name}.onsui.eth
│   │   └── api/                # auth (challenge/verify/logout), names/list, records
│   ├── components/             # name-grid, profile-view, edit-drawer, record-editor
│   ├── lib/
│   │   ├── auth/               # Sui wallet sign-in, Upstash Redis sessions
│   │   ├── namespace/          # Namespace offchain record upsert/schema
│   │   ├── suins/              # SuiNS client, name ownership, profile reads
│   │   └── records.ts          # {name}.onsui.eth ↔ {name}.sui label helpers
│   └── package.json
│
├── frontend/                   # Minimal single-page resolver (Vite + viem)
│
├── gateway/                    # Cloudflare Worker (CCIP-Read gateway)
│   ├── src/
│   │   ├── index.ts            # Router + CF Worker entry
│   │   ├── suins.ts            # SuiNS client, name resolution, avatar lookup
│   │   ├── namespace.ts        # Namespace offchain client, ENSIP-11 chain remap
│   │   ├── ccip-read/
│   │   │   ├── query.ts        # ENS query → resolve + ENSIP-7/9 encoding
│   │   │   ├── precedence.ts  # Fixed SuiNS/Namespace value selection policy
│   │   │   └── utils.ts        # CCIP-Read decode/encode/sign
│   │   └── handlers/
│   │       └── getCcipRead.ts  # /lookup/:sender/:data.json endpoint
│   ├── wrangler.toml
│   └── package.json
│
├── contracts/                  # Ethereum smart contract
│   ├── contracts/
│   │   ├── OffchainResolver.sol   # SUINSResolver (Ownable, CCIP-Read)
│   │   ├── SignatureVerifier.sol   # ECDSA signature verification
│   │   └── IExtendedResolver.sol   # ENSIP-10 interface
│   ├── scripts/
│   │   ├── deploy.ts              # Deploy SUINSResolver
│   │   └── set-resolver.ts        # Set onsui.eth resolver
│   └── hardhat.config.ts
│
└── examples/                   # Usage examples
    ├── resolve-sui-address.ts     # Resolve SUI address via viem
    └── resolve-all-records.ts     # Resolve all available records
```

## Standards

- [EIP-3668](https://eips.ethereum.org/EIPS/eip-3668) - CCIP-Read
- [ENSIP-10](https://docs.ens.domains/ensip/10) - Wildcard resolution
- [ENSIP-9](https://docs.ens.domains/ensip/9) - Multichain address resolution (coin type 784)
- [ENSIP-7](https://docs.ens.domains/ensip/7) - Content hash encoding (IPFS)
- [SLIP-44](https://github.com/nichanank/slip-0044) - Coin type 784 for SUI

## Deployments

| Component | Address / URL |
|-----------|--------------|
| Demo app | [`suins-ens-gateway.vercel.app`](https://suins-ens-gateway.vercel.app/) |
| SUINSResolver | [`0x7974AF8BD3AEe4fe9f8833361fBc3249E3b23aB3`](https://etherscan.io/address/0x7974AF8BD3AEe4fe9f8833361fBc3249E3b23aB3#code) |
| Gateway | [`suins-ens-gateway.happys1ngh.workers.dev`](https://suins-ens-gateway.happys1ngh.workers.dev/health) |
| Signer | `0xb29CC6c4fAb0981ee959110C7055FA365fEe2095` |
| onsui.eth resolver tx | [`0x6b673ca1...`](https://etherscan.io/tx/0x6b673ca10cc469ed059a798cc6c52ae24245401b4171655555edacd59f1dd6b0) |

## Development

### Gateway

```bash
cd gateway
npm install
npm run dev        # Local dev server
npm run deploy     # Deploy to Cloudflare Workers
```

### Contracts

```bash
cd contracts
npm install
cp .env.example .env   # Add DEPLOYER_PRIVATE_KEY
npx hardhat compile
npm run deploy         # Deploy to mainnet
npm run set-resolver   # Set onsui.eth resolver
```

### Testing

```bash
cd gateway

# Resolve all records (local)
npx tsx test-decode.ts happysingh

# Resolve all records (production)
npx tsx test-decode.ts happysingh --prod

# Test ENSIP-7 contenthash encoding
npx tsx test-contenthash.ts happysingh --prod
```

## Demo app

`demo/` is a wallet-first UI on top of the bridge. A Sui wallet signs in (challenge/response, sessions in Upstash Redis), sees every SuiNS name it holds, and opens any of them at `/{name}` — a public profile showing the ENS records resolvable at `{name}.onsui.eth`, with an inline edit drawer that writes new records to Namespace. The first save creates the offchain record; nothing is pre-created on browse.

```bash
cd demo
pnpm install
cp .env.example .env   # Upstash Redis, Namespace API key, gateway URL
pnpm dev
```

## Tech stack

| Component | Technology |
|-----------|-----------|
| Demo app | Next.js 16, React 19, `@mysten/dapp-kit-react`, `viem`, Upstash Redis |
| Namespace | `@thenamespace/offchain-manager` (offchain records the demo writes, the gateway reads) |
| Frontend (minimal) | Vanilla JS, Vite, `viem` |
| Gateway | TypeScript, Cloudflare Workers |
| Contract | Solidity 0.8.24, Hardhat, OpenZeppelin |
| SUINS | `@mysten/suins`, `@mysten/sui` |
| ENS | `viem`, `multiformats`, `@ensdomains/address-encoder` |
| Resolution | CCIP-Read (EIP-3668) |

## License

MIT
