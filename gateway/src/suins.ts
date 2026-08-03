import { SuiGrpcClient } from '@mysten/sui/grpc'
import { suins } from '@mysten/suins'

// Sui's public JSON-RPC endpoint no longer serves the methods SuiNS resolution
// needs ("Method not found"); the gRPC transport is the currently-supported path.
const suiClient = new SuiGrpcClient({
  network: 'mainnet',
  baseUrl: 'https://fullnode.mainnet.sui.io:443',
}).$extend(suins())

// The parent ENS domain we serve subnames for
const PARENT_DOMAIN = 'onsui.eth'

/**
 * Extract the SUINS name from a full ENS name.
 * e.g. "happysingh.onsui.eth" → "happysingh.sui"
 */
function toSuiName(ensName: string): string {
  const suffix = `.${PARENT_DOMAIN}`
  if (!ensName.endsWith(suffix)) {
    throw new Error(`Name "${ensName}" is not a subname of ${PARENT_DOMAIN}`)
  }
  const subdomain = ensName.slice(0, -suffix.length)
  return `${subdomain}.sui`
}

export interface SuinsRecord {
  targetAddress: string | null
  avatar: string | null
  contentHash: string | null
  walrusSiteId: string | null
}

/**
 * Resolve a full ENS name (e.g. "happysingh.onsui.eth") via SUINS.
 */
export async function resolveSuins(ensName: string): Promise<SuinsRecord | null> {
  const suiName = toSuiName(ensName)

  try {
    const nameRecord = await suiClient.suins.getNameRecord(suiName)

    if (!nameRecord) {
      return null
    }

    // Resolve avatar Sui object ID to its display image_url
    let avatarUrl: string | null = null
    if (nameRecord.avatar) {
      try {
        const { object } = await suiClient.core.getObject({
          objectId: nameRecord.avatar,
          include: { display: true },
        })
        const displayFields = object.display?.output as Record<string, string> | null | undefined
        avatarUrl = displayFields?.image_url ?? null
      } catch {
        avatarUrl = null
      }
    }

    return {
      targetAddress: nameRecord.targetAddress ?? null,
      avatar: avatarUrl,
      contentHash: nameRecord.contentHash ?? null,
      walrusSiteId: nameRecord.walrusSiteId ?? null,
    }
  } catch {
    return null
  }
}
