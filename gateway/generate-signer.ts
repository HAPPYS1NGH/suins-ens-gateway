/**
 * Generate a new signer key pair for the CCIP-Read gateway.
 * The private key goes into the CF Worker secret.
 * The public address goes into the OffchainResolver contract constructor.
 */
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

const privateKey = generatePrivateKey()
const account = privateKeyToAccount(privateKey)

console.log('=== SUINS-ENS Gateway Signer ===')
console.log('')
console.log(`Private Key: ${privateKey}`)
console.log(`Address:     ${account.address}`)
console.log('')
console.log('Next steps:')
console.log(`1. Set as CF Worker secret:  echo "${privateKey}" | npx wrangler secret put PRIVATE_KEY`)
console.log(`2. Use this address in the OffchainResolver constructor: ${account.address}`)
