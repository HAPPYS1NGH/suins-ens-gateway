# SUINS x ENS Bridge

Access any [Sui Name Service (SUINS)](https://suins.io) name through [ENS](https://ens.domains) — no registration needed.

Query `happysingh.onsui.eth` and get back `happysingh.sui` data from SUINS: SUI address, avatar, IPFS content hash, and more.

**Live on Ethereum Mainnet** | [SUINSResolver on Etherscan](https://etherscan.io/address/0x7974AF8BD3AEe4fe9f8833361fBc3249E3b23aB3#code) | [Gateway](https://suins-ens-gateway.happys1ngh.workers.dev/health)

## Try it

Any `.sui` name works through `onsui.eth`:

```
happysingh.onsui.eth  →  happysingh.sui
evan.onsui.eth        →  evan.sui
nick.onsui.eth        →  nick.sui
```

**Website hosting also works** — set an IPFS CID as content hash on your `.sui` name and access it via:
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

## Quick Start

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

## How It Works

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────┐     ┌───────────┐
│  ENS Client  │────▶│  SUINSResolver   │────▶│   Gateway   │────▶│   SUINS   │
│  (viem, etc) │     │  (Ethereum L1)   │     │ (CF Worker) │     │ (Sui L1)  │
└──────────────┘     └──────────────────┘     └─────────────┘     └───────────┘
```

1. **User queries** `happysingh.onsui.eth` through any ENS client
2. **SUINSResolver** on Ethereum reverts with `OffchainLookup` ([EIP-3668](https://eips.ethereum.org/EIPS/eip-3668)), redirecting the client to the gateway
3. **Gateway** strips `onsui.eth`, queries SUINS for `happysingh.sui` on Sui mainnet
4. **Gateway signs** the response and returns it
5. **SUINSResolver** verifies the signature on-chain and returns the data

No database. No subname registration. SUINS is the sole source of truth.

## What You Can Query

| ENS Query | SUINS Source | Notes |
|-----------|-------------|-------|
| `addr(784)` | `targetAddress` | SUI address ([SLIP-44](https://github.com/nichanank/slip-0044) coin type 784) |
| `contenthash()` | `content_hash` | IPFS CID → ENSIP-7 encoded (`0xe301` + CIDv1 bytes) |
| `text("avatar")` | `avatar` object → `display.image_url` | Resolves Sui NFT object to renderable image URL |
| `text("walrusSiteId")` | `walrus_site_id` | Walrus Site object ID on Sui |
| `text("org.suins.name")` | derived | The original `.sui` name |

### Content Hash Encoding

SUINS stores raw IPFS CID strings (e.g. `bafybei...`). The gateway encodes them into [ENSIP-7](https://docs.ens.domains/ensip/7) format so ENS clients and gateways like [eth.limo](https://eth.limo) can resolve the content:

```
SUINS: "bafybeiduzhsil3avfyxuy54pl4hpe7liq7yzft24d3dkigbeol7quwrk7u"
  ↓ parse CID (CIDv0 auto-converted to CIDv1)
  ↓ prefix with 0xe301 (ipfs-ns multicodec)
ENS:  0xe3010170122074c9e485ec152e2f4c778f5f0ef27d6887f192cf5c1ec6a4182472ff0a5a2afd
```

Both CIDv0 (`Qm...`) and CIDv1 (`bafy...`) are supported.

### Avatar Resolution

SUINS stores avatar as a Sui object ID. The gateway fetches the object's on-chain Display metadata to get the actual image URL:

```
SUINS: "0x93835f02ddb5d19f111d6c3da5c0cccc095d0848cd25e555ac39755cdda3d4a7"
  ↓ suiClient.getObject({ showDisplay: true })
  ↓ extract display.data.image_url
ENS:  "https://img.sm.xyz/0x93835f02ddb5d19f111d6c3da5c0cccc095d0848cd25e555ac39755cdda3d4a7/"
```

## Project Structure

```
├── gateway/                    # Cloudflare Worker (CCIP-Read gateway)
│   ├── src/
│   │   ├── index.ts            # Router + CF Worker entry
│   │   ├── suins.ts            # SUINS client, name resolution, avatar lookup
│   │   ├── ccip-read/
│   │   │   ├── query.ts        # ENS query → SUINS data + ENSIP-7 encoding
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

- [EIP-3668](https://eips.ethereum.org/EIPS/eip-3668) — CCIP-Read (Cross-Chain Interoperability Protocol)
- [ENSIP-10](https://docs.ens.domains/ensip/10) — Wildcard Resolution
- [ENSIP-9](https://docs.ens.domains/ensip/9) — Multichain Address Resolution (coin type 784)
- [ENSIP-7](https://docs.ens.domains/ensip/7) — Content Hash encoding (IPFS)
- [SLIP-44](https://github.com/nichanank/slip-0044) — Coin type 784 for SUI

## Deployments

| Component | Address / URL |
|-----------|--------------|
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

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Gateway | TypeScript, Cloudflare Workers |
| Contract | Solidity 0.8.24, Hardhat, OpenZeppelin |
| SUINS | `@mysten/suins`, `@mysten/sui` |
| ENS | `viem`, `multiformats` |
| Resolution | CCIP-Read (EIP-3668) |

## License

MIT
