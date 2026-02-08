# Contracts

Ethereum smart contracts for the SuiNS-ENS resolver.

## SUINSResolver

[`contracts/OffchainResolver.sol`](contracts/OffchainResolver.sol)

ENS resolver that uses CCIP-Read to fetch SuiNS data from the gateway.

### How it works

When you call `resolve()`, the contract doesn't return data. It reverts with an `OffchainLookup` error. That's the signal for CCIP-Read clients to query the gateway.

The client calls the gateway, gets a signed response, and sends it back via `resolveWithProof()`. The contract verifies the signature and returns the data.

### Functions

#### `resolve(bytes name, bytes data) → bytes`

Main resolver function. Always reverts with `OffchainLookup`.

**Parameters:**
- `name`: DNS-encoded name (e.g., `happysingh.onsui.eth`)
- `data`: ABI-encoded query (e.g., `addr(bytes32,uint256)`)

**Reverts with:**
```solidity
OffchainLookup(
    address sender,        // This contract
    string[] urls,         // Gateway URL
    bytes callData,        // Request to send to gateway
    bytes4 callbackFunction, // resolveWithProof.selector
    bytes extraData        // Context for verification
)
```

#### `resolveWithProof(bytes response, bytes extraData) → bytes`

Callback function. Verifies the gateway's signature and returns data.

**Parameters:**
- `response`: Signed response from gateway
- `extraData`: Context (request calldata + sender address)

**Returns:** Decoded result (address, string, etc.)

#### `setUrl(string url)`

**Owner only.** Updates the gateway URL.

#### `setSigners(address[] signers)`

**Owner only.** Adds trusted signer addresses.

#### `removeSigner(address signer)`

**Owner only.** Removes a signer.

### Events

- `UrlChanged(string url)`
- `NewSigners(address[] signers)`

### Errors

- `InvalidSignature(address signer)` — Signer not in trusted set
- `SignatureExpired(uint64 expires, uint256 currentTime)` — Response too old

## Deployment

### Install

```bash
npm install
```

### Set up environment

```bash
cp .env.example .env
```

Edit `.env`:
```
PRIVATE_KEY=<deployer wallet>
ETHERSCAN_API_KEY=<optional>
```

### Deploy

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

The script asks for:
1. Gateway URL
2. Signer address

Outputs the contract address.

### Verify

```bash
npx hardhat verify --network sepolia <address> <url> <signer>
```

## Testing

No tests yet. You can test manually:

1. Deploy the contract
2. Set the resolver on an ENS name
3. Query with viem:
   ```javascript
   const address = await client.getEnsAddress({
     name: normalize("test.onsui.eth"),
     coinType: 784,
   });
   ```

## Project structure

```
contracts/
├── OffchainResolver.sol      # Main resolver
├── IExtendedResolver.sol     # ENSIP-10 interface
└── SignatureVerifier.sol     # ECDSA signature verification
```

## Dependencies

- **@openzeppelin/contracts**: Ownable, ERC165
- **@ensdomains/ens-contracts**: ENS interfaces
- **hardhat**: Build and deploy

## License

MIT
