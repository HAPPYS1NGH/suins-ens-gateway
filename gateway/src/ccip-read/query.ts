import { getCoderByCoinType } from '@ensdomains/address-encoder'
import { zeroAddress } from 'viem'
import { toHex } from 'viem/utils'
import { CID } from 'multiformats/cid'
import { base32 } from 'multiformats/bases/base32'
import { base58btc } from 'multiformats/bases/base58'

import { resolveNamespace } from '../namespace'
import { resolveSuins } from '../suins'
import { selectRecordValue } from './precedence'
import { ResolverQuery } from './utils'

// SUI coin type per SLIP-44 / ENSIP-9
const SUI_COIN_TYPE = BigInt(784)
const ETH_COIN_TYPE = BigInt(60)

// Sui addresses are 32 bytes; viem's zeroAddress is a 20-byte EVM address and
// would decode wrong for coin 784.
const SUI_ZERO_ADDRESS = `0x${'00'.repeat(32)}` as const

// ENSIP-7 ipfs-ns multicodec varint (0xe3 = 227, encoded as unsigned varint)
const IPFS_NS = new Uint8Array([0xe3, 0x01])

/**
 * Encode a CID string into ENSIP-7 contenthash format.
 * Format: <namespace-varint><cidv1-bytes>
 *
 * SUINS (and Namespace, using the same convention) store raw IPFS CID strings
 * (CIDv0 "Qm..." or CIDv1 "bafy..."). ENSIP-7 requires:
 * <ipfs-ns varint 0xe301> + <CIDv1 bytes>. CIDv0 is converted to CIDv1 automatically.
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
 * Encode a display-form address into ENSIP-9 `addr(node, coinType)` bytes.
 *
 * `addr(node)` (Ethereum, no coinType argument) and `addr(node, 60)` both return
 * Solidity `address`/20-byte EVM bytes, so an empty value there is conventionally
 * the 20-byte zero address. Every other coin type returns native chain bytes, whose
 * length is coin-specific — an empty or unsupported/malformed value there must be
 * zero-length `0x`, never a 20- or 32-byte zero borrowed from a different chain.
 */
function encodeEnsipNineAddress(value: string, coinType: bigint): string {
  const isEthCall = coinType === ETH_COIN_TYPE
  if (!value) return isEthCall ? zeroAddress : '0x'

  try {
    return toHex(getCoderByCoinType(Number(coinType)).decode(value))
  } catch {
    return isEthCall ? zeroAddress : '0x'
  }
}

/**
 * Resolve an ENS query by looking up the corresponding SUINS name and the public
 * Namespace record, then selecting one value per the fixed precedence policy.
 *
 * Supported queries:
 * - addr(784)  → SUI target address from SUINS
 * - addr(60) / addr(node) / other coin types → address from Namespace, ENSIP-9 encoded
 * - text(key)  → SuiNS-authoritative keys (avatar/contentHash/walrus/org.suins.name)
 *   fall back to or are overridden only per the precedence policy; every other key
 *   comes from Namespace
 * - contenthash → SUINS contentHash, falling back to Namespace's
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
    const coinType = args[1] ?? ETH_COIN_TYPE
    const value = selectRecordValue(query, nameData, namespaceData)

    if (coinType === SUI_COIN_TYPE) {
      // The canonical Sui address cannot be changed through Namespace.
      return value || SUI_ZERO_ADDRESS
    }

    return encodeEnsipNineAddress(value, coinType)
  }

  // No early return when nameData is null: `addr` was already handled above, and
  // the remaining query types fall back to Namespace via `selectRecordValue`, which
  // tolerates a null SuiNS record through optional chaining. The only SuiNS-only
  // keys (contentHash/walrus/walrusSiteId) correctly return '' when SuiNS is absent,
  // and `org.suins.name` is derived from the requested name, not from SuiNS data.
  switch (functionName) {
    case 'text': {
      const key = args[1]

      if (key === 'org.suins.name') {
        // Convenience: return the original SUI name. Derived from the requested
        // name itself, not from either record source.
        return name.split('.')[0] + '.sui'
      }

      return selectRecordValue(query, nameData, namespaceData)
    }

    case 'contenthash': {
      const value = selectRecordValue(query, nameData, namespaceData)
      if (!value) return '0x'

      try {
        return encodeEnsContenthash(value)
      } catch {
        // CID parsing failed — return empty
        return '0x'
      }
    }

    default:
      throw new Error(`Unsupported query function: ${functionName}`)
  }
}
