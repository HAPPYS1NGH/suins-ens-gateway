import { ChainName, createOffchainClient, getCoinType } from '@thenamespace/offchain-manager'

// Public reads never need a credential — only Next.js mutations in `demo/` hold
// `NAMESPACE_API_KEY`. This client is intentionally unauthenticated.
const client = createOffchainClient({ mode: 'mainnet' })

export const ETH_COIN_TYPE_KEY = String(getCoinType(ChainName.Ethereum))

const CACHE_TTL_SECONDS = 60

export interface NamespaceRecord {
  addresses: Record<string, string>
  texts: Record<string, string>
  contenthash: string | null
}

function cacheKey(ensName: string): Request {
  // A synthetic same-origin request used only as a Cache API key, never fetched.
  return new Request(`https://namespace-cache.internal/${encodeURIComponent(ensName)}`)
}

/**
 * Resolve a full ENS name (e.g. "happysingh.onsui.eth") via the public Namespace
 * offchain-manager API. Never returns the raw `SubnameDTO` — only the record
 * families the gateway is allowed to serve. One resolved page produces several
 * calls into this function (addr, one or more text keys, contenthash); a short
 * Cache API entry keyed by full name absorbs that fan-out.
 */
export async function resolveNamespace(ensName: string): Promise<NamespaceRecord | null> {
  const cache = caches.default
  const key = cacheKey(ensName)

  const cached = await cache.match(key)
  if (cached) {
    return cached.status === 204 ? null : ((await cached.json()) as NamespaceRecord)
  }

  try {
    const dto = await client.getSingleSubname(ensName)
    const record: NamespaceRecord | null = dto
      ? { addresses: dto.addresses, texts: dto.texts, contenthash: dto.contenthash ?? null }
      : null

    const response = record
      ? new Response(JSON.stringify(record), {
          headers: {
            'cache-control': `max-age=${CACHE_TTL_SECONDS}`,
            'content-type': 'application/json',
          },
        })
      : new Response(null, {
          status: 204,
          headers: { 'cache-control': `max-age=${CACHE_TTL_SECONDS}` },
        })

    await cache.put(key, response.clone())
    return record
  } catch {
    // A read failure degrades to "no Namespace data" for this request only. It is
    // never cached, so the next request gets a fresh attempt rather than a stuck miss.
    return null
  }
}
