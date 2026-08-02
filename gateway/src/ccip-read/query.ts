import { zeroAddress } from 'viem'
import { toHex } from 'viem/utils'
import { CID } from 'multiformats/cid'
import { base32 } from 'multiformats/bases/base32'
import { base58btc } from 'multiformats/bases/base58'

import { ETH_COIN_TYPE_KEY, resolveNamespace } from '../namespace'
import { resolveSuins } from '../suins'
import { ResolverQuery } from './utils'

// SUI coin type per SLIP-44 / ENSIP-9
const SUI_COIN_TYPE = BigInt(784)

// Sui addresses are 32 bytes; viem's zeroAddress is a 20-byte EVM address and
// would decode wrong for coin 784.
const SUI_ZERO_ADDRESS = `0x${'00'.repeat(32)}` as const

// ENSIP-7 ipfs-ns multicodec varint (0xe3 = 227, encoded as unsigned varint)
const IPFS_NS = new Uint8Array([0xe3, 0x01])

/**
 * Encode a CID string into ENSIP-7 contenthash format.
 * Format: <namespace-varint><cidv1-bytes>
 *
 * SUINS stores raw IPFS CID strings (CIDv0 "Qm..." or CIDv1 "bafy...").
 * ENSIP-7 requires: <ipfs-ns varint 0xe301> + <CIDv1 bytes>.
 * CIDv0 is converted to CIDv1 automatically.
 */
function encodeEnsContenthash(value: string): `0x${string}` {
  let cid: CID

  if (value.startsWith('Qm')) {
    // CIDv0 (base58btc) → parse then convert to CIDv1
    cid = CID.parse(value, base58btc).toV1()
  } else if (value.startsWith('bafy') || value.startsWith('bafk') || value.startsWith('baf')) {
    // CIDv1 base32lower
    cid = CID.parse(value, base32)
  } else {
    // Try generic parse, convert to v1 if needed
    cid = CID.parse(value)
    if (cid.version === 0) {
      cid = cid.toV1()
    }
  }

  // ENSIP-7: ipfs-ns varint (0xe301) + CIDv1 raw bytes
  const result = new Uint8Array(IPFS_NS.length + cid.bytes.length)
  result.set(IPFS_NS)
  result.set(cid.bytes, IPFS_NS.length)

  return toHex(result)
}

/**
 * Resolve an ENS query by looking up the corresponding SUINS name and, for the
 * `addr` branch, the public Namespace record.
 *
 * Supported queries:
 * - addr(784)  → SUI target address from SUINS
 * - addr(60) / addr(node) → Ethereum address from Namespace
 * - text(key)  → avatar, contentHash, walrusSiteId from SUINS data
 * - contenthash → SUINS contentHash if available
 */
export async function getRecord(
  name: string,
  query: ResolverQuery
): Promise<string> {
  const { functionName, args } = query

  // Fetched in parallel: one page can trigger several of these calls, and a slow
  // or failing Namespace read must never hold up or break SuiNS resolution.
  const [nameData, namespaceData] = await Promise.all([
    resolveSuins(name),
    resolveNamespace(name),
  ])

  if (functionName === 'addr') {
    const coinType = args[1] ?? BigInt(60)

    if (coinType === SUI_COIN_TYPE) {
      // The canonical Sui address cannot be changed through Namespace.
      return nameData?.targetAddress ?? SUI_ZERO_ADDRESS
    }

    if (String(coinType) === ETH_COIN_TYPE_KEY) {
      return namespaceData?.addresses[ETH_COIN_TYPE_KEY] ?? zeroAddress
    }

    // Other coin types join in a later phase.
    return zeroAddress
  }

  if (!nameData) {
    // Name doesn't exist in SUINS — return empty/zero defaults for the remaining
    // SUINS-sourced query types.
    return functionName === 'text' ? '' : '0x'
  }

  switch (functionName) {
    case 'text': {
      const key = args[1]

      switch (key) {
        case 'avatar':
          return nameData.avatar ?? ''
        case 'contentHash':
          return nameData.contentHash ?? ''
        case 'walrusSiteId':
          return nameData.walrusSiteId ?? ''
        case 'org.suins.name':
          // Convenience: return the original SUI name
          return name.split('.')[0] + '.sui'
        default:
          return ''
      }
    }

    case 'contenthash': {
      // SUINS stores raw IPFS CID strings in content_hash.
      // Encode as ENSIP-7: 0xe301 (ipfs-ns) + CIDv1 bytes
      if (nameData.contentHash) {
        try {
          return encodeEnsContenthash(nameData.contentHash)
        } catch {
          // CID parsing failed — return empty
          return '0x'
        }
      }
      return '0x'
    }

    default:
      throw new Error(`Unsupported query function: ${functionName}`)
  }
}
