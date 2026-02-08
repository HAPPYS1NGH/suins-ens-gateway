import { zeroAddress } from 'viem'
import { toHex } from 'viem/utils'

import { resolveSuins } from '../suins'
import { ResolverQuery } from './utils'

// SUI coin type per SLIP-44 / ENSIP-9
const SUI_COIN_TYPE = BigInt(784)

/**
 * Resolve an ENS query by looking up the corresponding SUINS name.
 *
 * Supported queries:
 * - addr(784)  → SUI target address from SUINS
 * - addr(60)   → returns zero address (no ETH mapping)
 * - text(key)  → avatar, contentHash, walrusSiteId from SUINS data
 * - contenthash → SUINS contentHash if available
 */
export async function getRecord(
  name: string,
  query: ResolverQuery
): Promise<string> {
  const { functionName, args } = query
  const nameData = await resolveSuins(name)

  if (!nameData) {
    // Name doesn't exist in SUINS — return empty/zero defaults
    switch (functionName) {
      case 'addr':
        return zeroAddress
      case 'text':
        return ''
      case 'contenthash':
        return '0x'
    }
  }

  switch (functionName) {
    case 'addr': {
      const coinType = args[1] ?? BigInt(60)

      if (coinType === SUI_COIN_TYPE) {
        // Return SUI address as raw bytes
        // SUI addresses are 32-byte hex strings (0x + 64 hex chars)
        return nameData.targetAddress ?? zeroAddress
      }

      // For other coin types, we don't have data
      return zeroAddress
    }

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
      // Return contentHash as hex if available
      if (nameData.contentHash) {
        // If it's already hex, return as-is; otherwise encode as UTF-8 hex
        if (nameData.contentHash.startsWith('0x')) {
          return nameData.contentHash
        }
        return toHex(nameData.contentHash)
      }
      return '0x'
    }

    default:
      throw new Error(`Unsupported query function: ${functionName}`)
  }
}
