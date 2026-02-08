# Deployment Guide

This guide walks through deploying the SUINSResolver contract and the gateway.

## Prerequisites

- Node.js 18+
- An Ethereum wallet with ETH (for contract deployment)
- Cloudflare account (free tier works)
- Wrangler CLI installed (`npm install -g wrangler`)

## 1. Deploy the gateway

The gateway needs to be live before you deploy the contract, because you'll need the gateway URL.

### Generate a signer key

```bash
cd gateway
npx tsx generate-signer.ts
```

This outputs:
```
Address: 0x...
Private Key: 0x...
```

Save these. The private key goes in your environment, the address goes in the contract.

### Set environment variables

Create `.dev.vars` for local dev:
```bash
PRIVATE_KEY=0x...
```

For production, set secrets in Cloudflare:
```bash
wrangler secret put PRIVATE_KEY
```

Paste the private key when prompted.

### Deploy to Cloudflare

```bash
npm install
npm run deploy
```

Wrangler outputs the URL:
```
Published suins-ens-gateway
  https://suins-ens-gateway.your-subdomain.workers.dev
```

Save this URL. You'll need it for the contract.

### Test the gateway

```bash
npm run dev
```

In another terminal:
```bash
npx tsx test.ts
```

If you see responses with `data: "0x..."`, it works.

## 2. Deploy the contract

### Set up environment

```bash
cd contracts
npm install
cp .env.example .env
```

Edit `.env`:
```
PRIVATE_KEY=<your deployer wallet private key>
ETHERSCAN_API_KEY=<optional, for verification>
```

### Deploy to Sepolia

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

The script asks for:
1. Gateway URL (from step 1)
2. Signer address (from `generate-signer.ts`)

It deploys the contract and prints:
```
SUINSResolver deployed to: 0x...
```

Save this address.

### Verify the contract (optional)

```bash
npx hardhat verify --network sepolia <contract-address> <gateway-url> <signer-address>
```

## 3. Set up ENS

You need `onsui.eth` (or whatever parent domain you chose) to point to your resolver.

### On mainnet

1. Own `onsui.eth` (or buy it if available)
2. Set the resolver to your deployed `SUINSResolver` address
3. Set the wildcard resolver (so `*.onsui.eth` uses your resolver)

This requires ENS DAO approval for official `.eth` subdomains. For testing, use Sepolia.

### On Sepolia

Register a test name at [sepolia.app.ens.domains](https://sepolia.app.ens.domains).

Set the resolver to your `SUINSResolver` address. Enable wildcard resolution.

## 4. Test end-to-end

```bash
cd examples
npm install
node resolve-sui-address.js
```

If you get a SUI address back, it works.

## 5. Monitor the gateway

Check gateway logs:
```bash
wrangler tail
```

This streams real-time logs. Useful for debugging.

## Updating the gateway

Edit code, then:
```bash
npm run deploy
```

Cloudflare deploys instantly. No downtime.

## Updating the contract

Contracts are immutable. To change logic, deploy a new contract and update the ENS resolver address.

To add/remove signers or change the gateway URL without redeploying:
```javascript
// Connect with owner wallet
const resolver = await ethers.getContractAt("SUINSResolver", contractAddress);

// Update gateway URL
await resolver.setUrl("https://new-gateway.workers.dev");

// Add new signer
await resolver.setSigners(["0xNewSignerAddress"]);

// Remove old signer
await resolver.removeSigner("0xOldSignerAddress");
```

## Troubleshooting

**Gateway returns 400 "Name is not a subname of onsui.eth"**

You're querying the wrong domain. The gateway only handles `.onsui.eth` names.

**Contract reverts with "InvalidSignature"**

The signer address in the contract doesn't match the private key in the gateway. Check:
1. Gateway private key matches the address you added to signers
2. You called `setSigners()` with the right address

**No response from gateway**

Check gateway logs with `wrangler tail`. Common issues:
- Sui mainnet RPC is down (rare)
- Name doesn't exist on SuiNS
- CORS issue (gateway should allow all origins)

**ENS client doesn't trigger CCIP-Read**

Make sure:
1. Your ENS client supports EIP-3668 (viem and ethers v6 do)
2. The resolver contract is set correctly on your ENS name
3. You're calling `getEnsAddress()` or similar (not manually calling the contract)
