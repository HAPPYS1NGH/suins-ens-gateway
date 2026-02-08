# SuiNS-ENS Gateway

This project lets you resolve Sui Name Service (SuiNS) names through the Ethereum Name Service (ENS). If you own `happysingh.sui` on Sui, you can query it as `happysingh.onsui.eth` from any ENS client.

**🌐 Demo:** [happysingh.sui.id](https://happysingh.sui.id) • [happysingh.onsui.eth.limo](https://happysingh.onsui.eth.limo) | **📦 [GitHub](https://github.com/HAPPYS1NGH/suins-ens-gateway)**

## What this does

ENS clients expect on-chain data. SuiNS names live on Sui. We bridge them using EIP-3668 (CCIP-Read), which lets Ethereum contracts fetch data from offchain sources.

When someone queries `happysingh.onsui.eth`:
1. The ENS client hits our resolver contract on Ethereum
2. The contract throws an `OffchainLookup` error (this is EIP-3668)
3. The client calls our gateway API
4. The gateway fetches `happysingh.sui` from Sui mainnet
5. It signs the response and sends it back
6. The contract verifies the signature and returns the data

## Quick example

```javascript
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";

const SUI_COIN_TYPE = 784; // SLIP-0044

const client = createPublicClient({
  chain: mainnet,
  transport: http(),
});

const address = await client.getEnsAddress({
  name: normalize("happysingh.onsui.eth"),
  coinType: SUI_COIN_TYPE,
});

console.log(address); // 0x... (32-byte Sui address)
```

Full working example in [`examples/resolve-sui-address.js`](examples/resolve-sui-address.js).

## What you can query

The gateway maps SuiNS fields to ENS standards:

| ENS query | Returns |
|-----------|---------|
| `addr(784)` | SUI address from SuiNS `targetAddress` |
| `text("avatar")` | Avatar URL |
| `text("contentHash")` | Raw IPFS CID string |
| `text("walrusSiteId")` | Walrus site ID |
| `text("org.suins.name")` | Original .sui name |
| `contenthash()` | ENSIP-7 encoded contenthash (0xe301 + CIDv1) |

## Host websites on SuiNS + ENS

Because we bridge `contenthash()`, you can host websites on IPFS and access them via both SuiNS and ENS gateways:

1. Set your IPFS CID as `contentHash` on your SuiNS name (`happysingh.sui`)
2. Access your site via:
   - **SuiNS gateway:** https://happysingh.sui.id
   - **ENS gateway:** https://happysingh.onsui.eth.limo

Same content, two access points. The gateway converts SuiNS contentHash to ENSIP-7 format automatically.

## Project structure

```
├── contracts/          # Ethereum resolver contract
├── gateway/            # Cloudflare Worker CCIP-Read gateway
└── examples/           # Usage examples
```

## Get started

**Run the gateway locally:**
```bash
cd gateway
npm install
npm run dev
```

**Deploy the gateway:**
```bash
npm run deploy
```

**Deploy the contract:**
```bash
cd contracts
npm install
npx hardhat run scripts/deploy.ts --network sepolia
```

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for details.

## How it works

Read [`ARCHITECTURE.md`](ARCHITECTURE.md) for the full technical breakdown.

## License

MIT
