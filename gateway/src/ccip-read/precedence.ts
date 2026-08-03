import type { NamespaceRecord } from '../namespace'
import type { SuinsRecord } from '../suins'
import type { ResolverQuery } from './utils'

// SUI coin type per SLIP-44 / ENSIP-9. Namespace can never override the canonical
// Sui address.
const SUI_COIN_TYPE = BigInt(784)

// Sui-native text keys Namespace cannot override, even when Namespace has a value.
// "walrus" and "walrusSiteId" are both aliases for the same SuiNS field.
const SUI_NATIVE_TEXT_KEYS: Record<string, keyof SuinsRecord> = {
  contentHash: 'contentHash',
  walrusSiteId: 'walrusSiteId',
  walrus: 'walrusSiteId',
}

/**
 * Selects one display-form value for a resolver query according to the fixed
 * SuiNS/Namespace precedence policy:
 *
 * - `addr(node, 784)` is SuiNS-only.
 * - Sui-native text keys (contentHash, walrusSiteId/walrus) are SuiNS-only.
 * - `avatar` and `contenthash` take a non-empty SuiNS value, falling back to
 *   Namespace only when SuiNS has none.
 * - Every other coin type and text key comes from Namespace.
 *
 * Pure and network-free — callers resolve both sources first. Returns `''` when
 * neither source has a value; callers map that to the function-specific empty ENS
 * value (zero address, empty string, or `0x`).
 *
 * `text(node, "org.suins.name")` is derived from the requested ENS name itself, not
 * from either record source, so callers resolve it before reaching this function.
 */
export function selectRecordValue(
  query: ResolverQuery,
  suins: SuinsRecord | null,
  namespace: NamespaceRecord | null
): string {
  if (query.functionName === 'addr') {
    const coinType = query.args[1] ?? BigInt(60)

    if (coinType === SUI_COIN_TYPE) {
      return suins?.targetAddress ?? ''
    }

    return namespace?.addresses[String(coinType)] ?? ''
  }

  if (query.functionName === 'text') {
    const key = query.args[1]

    if (key === 'avatar') {
      return suins?.avatar || namespace?.texts.avatar || ''
    }

    const suiNativeField = SUI_NATIVE_TEXT_KEYS[key]
    if (suiNativeField) {
      return suins?.[suiNativeField] ?? ''
    }

    return namespace?.texts[key] ?? ''
  }

  // contenthash
  return suins?.contentHash || namespace?.contenthash || ''
}
