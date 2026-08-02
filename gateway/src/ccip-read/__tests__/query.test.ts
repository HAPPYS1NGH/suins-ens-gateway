import { zeroAddress } from 'viem'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { resolveSuins } = vi.hoisted(() => ({ resolveSuins: vi.fn() }))
const { resolveNamespace } = vi.hoisted(() => ({ resolveNamespace: vi.fn() }))

vi.mock('../../suins', () => ({ resolveSuins }))
vi.mock('../../namespace', () => ({ resolveNamespace, ETH_COIN_TYPE_KEY: '60' }))

const { getRecord } = await import('../query')

const NAME = 'happysingh.onsui.eth'
const NODE = `0x${'0'.repeat(64)}` as const
const SUI_ADDRESS = `0x${'1'.repeat(64)}`
const ETH_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'

const suinsRecord = (overrides: Record<string, unknown> = {}) => ({
  targetAddress: null,
  avatar: null,
  contentHash: null,
  walrusSiteId: null,
  ...overrides,
})

const namespaceRecord = (overrides: Record<string, unknown> = {}) => ({
  addresses: {},
  texts: {},
  contenthash: null,
  ...overrides,
})

beforeEach(() => {
  vi.resetAllMocks()
})

describe('getRecord addr', () => {
  it('resolves coin type 784 from SuiNS', async () => {
    resolveSuins.mockResolvedValue(suinsRecord({ targetAddress: SUI_ADDRESS }))
    resolveNamespace.mockResolvedValue(null)

    const result = await getRecord(NAME, { functionName: 'addr', args: [NODE, 784n] })

    expect(result).toBe(SUI_ADDRESS)
  })

  it('resolves coin type 60 from Namespace', async () => {
    resolveSuins.mockResolvedValue(null)
    resolveNamespace.mockResolvedValue(namespaceRecord({ addresses: { '60': ETH_ADDRESS } }))

    const result = await getRecord(NAME, { functionName: 'addr', args: [NODE, 60n] })

    // ENSIP-9 decoding round-trips through raw bytes, which drops EIP-55 casing;
    // the address bytes themselves must still match exactly.
    expect(result.toLowerCase()).toBe(ETH_ADDRESS.toLowerCase())
  })

  it('defaults addr(node) with no coinType argument to the Namespace ETH address', async () => {
    resolveSuins.mockResolvedValue(null)
    resolveNamespace.mockResolvedValue(namespaceRecord({ addresses: { '60': ETH_ADDRESS } }))

    const result = await getRecord(NAME, { functionName: 'addr', args: [NODE] })

    expect(result.toLowerCase()).toBe(ETH_ADDRESS.toLowerCase())
  })

  it('returns the zero address when both sources are missing', async () => {
    resolveSuins.mockResolvedValue(null)
    resolveNamespace.mockResolvedValue(null)

    const result = await getRecord(NAME, { functionName: 'addr', args: [NODE, 60n] })

    expect(result).toBe(zeroAddress)
  })

  it('still returns the SuiNS address when Namespace is unavailable', async () => {
    resolveSuins.mockResolvedValue(suinsRecord({ targetAddress: SUI_ADDRESS }))
    resolveNamespace.mockResolvedValue(null)

    const result = await getRecord(NAME, { functionName: 'addr', args: [NODE, 784n] })

    expect(result).toBe(SUI_ADDRESS)
  })

  it('returns empty bytes for a non-EVM coin type neither source maps', async () => {
    resolveSuins.mockResolvedValue(null)
    resolveNamespace.mockResolvedValue(namespaceRecord({ addresses: { '60': ETH_ADDRESS } }))

    // Coin type 0 (Bitcoin) is a supported coder, but Namespace has no value for it —
    // the empty result must be zero-length bytes, not a 20-byte EVM zero address.
    const result = await getRecord(NAME, { functionName: 'addr', args: [NODE, 0n] })

    expect(result).toBe('0x')
  })

  it('returns a 32-byte zero for coin type 784 with no targetAddress, not the 20-byte EVM zero address', async () => {
    resolveSuins.mockResolvedValue(suinsRecord({ targetAddress: null }))
    resolveNamespace.mockResolvedValue(null)

    const result = await getRecord(NAME, { functionName: 'addr', args: [NODE, 784n] })

    expect(result).toBe(`0x${'00'.repeat(32)}`)
    expect(result).not.toBe(zeroAddress)
  })

  it('ENSIP-9: an EVM address round-trips as 20 bytes', async () => {
    resolveSuins.mockResolvedValue(null)
    resolveNamespace.mockResolvedValue(namespaceRecord({ addresses: { '60': ETH_ADDRESS } }))

    const result = await getRecord(NAME, { functionName: 'addr', args: [NODE, 60n] })

    expect(result.toLowerCase()).toBe(ETH_ADDRESS.toLowerCase())
    expect((result.length - 2) / 2).toBe(20)
  })

  it('ENSIP-9: a non-EVM address is encoded as native bytes, not UTF-8', async () => {
    const SOL_ADDRESS = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'
    resolveSuins.mockResolvedValue(null)
    resolveNamespace.mockResolvedValue(namespaceRecord({ addresses: { '501': SOL_ADDRESS } }))

    const result = await getRecord(NAME, { functionName: 'addr', args: [NODE, 501n] })

    // A UTF-8 encoding of the base58 string would be 44 bytes; native Solana
    // pubkey bytes are 32.
    expect((result.length - 2) / 2).toBe(32)
    expect((result.length - 2) / 2).not.toBe(SOL_ADDRESS.length)
  })

  it('ENSIP-9: a malformed address for the requested chain returns empty bytes', async () => {
    resolveSuins.mockResolvedValue(null)
    resolveNamespace.mockResolvedValue(
      namespaceRecord({ addresses: { '501': 'not-a-valid-solana-address!' } })
    )

    const result = await getRecord(NAME, { functionName: 'addr', args: [NODE, 501n] })

    expect(result).toBe('0x')
  })
})

describe('getRecord text/contenthash', () => {
  it('still resolves SuiNS text records when Namespace is unavailable', async () => {
    resolveSuins.mockResolvedValue(suinsRecord({ avatar: 'https://example.com/a.png' }))
    resolveNamespace.mockResolvedValue(null)

    const result = await getRecord(NAME, { functionName: 'text', args: [NODE, 'avatar'] })

    expect(result).toBe('https://example.com/a.png')
  })

  it('returns empty text when the SuiNS name does not exist', async () => {
    resolveSuins.mockResolvedValue(null)
    resolveNamespace.mockResolvedValue(null)

    const result = await getRecord(NAME, { functionName: 'text', args: [NODE, 'avatar'] })

    expect(result).toBe('')
  })

  it('returns 0x contenthash when the SuiNS name does not exist', async () => {
    resolveSuins.mockResolvedValue(null)
    resolveNamespace.mockResolvedValue(null)

    const result = await getRecord(NAME, { functionName: 'contenthash', args: [NODE] })

    expect(result).toBe('0x')
  })

  it('resolves an arbitrary text key from Namespace', async () => {
    resolveSuins.mockResolvedValue(suinsRecord())
    resolveNamespace.mockResolvedValue(namespaceRecord({ texts: { 'com.twitter': 'happysingh' } }))

    const result = await getRecord(NAME, { functionName: 'text', args: [NODE, 'com.twitter'] })

    expect(result).toBe('happysingh')
  })

  it('walrus and walrusSiteId stay SuiNS-only even when Namespace has a value', async () => {
    resolveSuins.mockResolvedValue(suinsRecord({ walrusSiteId: 'sui-walrus-id' }))
    resolveNamespace.mockResolvedValue(namespaceRecord({ texts: { walrus: 'namespace-walrus-id' } }))

    const result = await getRecord(NAME, { functionName: 'text', args: [NODE, 'walrus'] })

    expect(result).toBe('sui-walrus-id')
  })

  it('falls back to Namespace contenthash when SuiNS has none', async () => {
    resolveSuins.mockResolvedValue(suinsRecord())
    resolveNamespace.mockResolvedValue(
      namespaceRecord({ contenthash: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi' })
    )

    const result = await getRecord(NAME, { functionName: 'contenthash', args: [NODE] })

    expect(result.startsWith('0xe301')).toBe(true)
  })
})
