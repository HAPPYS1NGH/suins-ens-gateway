# Gateway

Cloudflare Worker that handles CCIP-Read requests for SuiNS names.

## What it does

When an ENS client queries `happysingh.onsui.eth`, this gateway:
1. Receives the request at `/lookup/{sender}/{data}.json`
2. Decodes the calldata to see what you're asking for
3. Queries Sui mainnet for `happysingh.sui`
4. Signs the response
5. Returns it to the client

## API

### `GET /lookup/:sender/:data.json`

CCIP-Read endpoint. The ENS client constructs this URL automatically.

**Parameters:**
- `sender`: Resolver contract address (0x...)
- `data`: ABI-encoded calldata (0x...)

**Response:**
```json
{
  "data": "0x..." // Signed response
}
```

### `GET /health`

Health check.

**Response:**
```json
{
  "status": "ok",
  "service": "suins-ens-gateway"
}
```

## Development

### Install dependencies

```bash
npm install
```

### Set up environment

Create `.dev.vars`:
```
PRIVATE_KEY=0x...
```

Generate a key with:
```bash
npx tsx generate-signer.ts
```

### Run locally

```bash
npm run dev
```

Gateway runs on http://localhost:8787.

### Test it

```bash
npx tsx test.ts
```

This simulates what an ENS client does. You should see responses with SUI addresses.

### Deploy

```bash
wrangler secret put PRIVATE_KEY  # paste your key
npm run deploy
```

Outputs the production URL.

## Project structure

```
src/
├── index.ts              # Router and entry point
├── env.ts                # TypeScript environment types
├── suins.ts              # SuiNS client and name mapping
├── handlers/
│   ├── getCcipRead.ts    # Main CCIP-Read handler
│   └── index.ts          # Barrel export
└── ccip-read/
    ├── query.ts          # ENS query → SuiNS field mapping
    └── utils.ts          # Encoding/decoding/signing
```

## How requests work

1. **Decode request**  
   `getCcipRead.ts` validates the sender and data params, then calls `decodeEnsOffchainRequest()` to parse the calldata.

2. **Query SuiNS**  
   `query.ts` calls `resolveSuins()` to fetch the name from Sui mainnet. The name is mapped: `happysingh.onsui.eth` → `happysingh.sui`.

3. **Format response**  
   Depending on the query (`addr`, `text`, `contenthash`), we pull the right field from the SuiNS record.

4. **Sign it**  
   `encodeEnsOffchainResponse()` signs the response with the private key and encodes it for the contract.

5. **Return JSON**  
   Client gets `{data: "0x..."}` and sends it back to the contract for verification.

## Supported queries

See [ARCHITECTURE.md](../ARCHITECTURE.md#4-query-handler) for the full table.

Quick summary:
- `addr(784)` → SUI address
- `text("avatar")` → Avatar URL
- `text("contentHash")` → IPFS CID
- `contenthash()` → ENSIP-7 encoded hash

## Dependencies

- **viem**: ABI encoding/decoding, signing
- **@mysten/sui**: Sui client
- **@mysten/suins**: SuiNS client
- **itty-router**: Routing
- **zod**: Request validation
- **multiformats**: IPFS CID parsing for contenthash

## Logs

```bash
wrangler tail
```

Shows real-time requests. Useful for debugging.

## License

MIT
