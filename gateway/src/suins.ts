import { SuinsClient } from '@mysten/suins'
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client'

const suiClient = new SuiClient({ url: getFullnodeUrl('mainnet') })

const suinsClient = new SuinsClient({
  client: suiClient as any,
  network: 'mainnet',
})

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
    const nameRecord = await suinsClient.getNameRecord(suiName)

    if (!nameRecord) {
      return null
    }

    // Resolve avatar Sui object ID to its display image_url
    let avatarUrl: string | null = null
    if (nameRecord.avatar) {
      try {
        const obj = await suiClient.getObject({
          id: nameRecord.avatar,
          options: { showDisplay: true },
        })
        avatarUrl = obj.data?.display?.data?.image_url ?? null
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
