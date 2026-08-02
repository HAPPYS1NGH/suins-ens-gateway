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

    expect(result).toBe(ETH_ADDRESS)
  })

  it('defaults addr(node) with no coinType argument to the Namespace ETH address', async () => {
    resolveSuins.mockResolvedValue(null)
    resolveNamespace.mockResolvedValue(namespaceRecord({ addresses: { '60': ETH_ADDRESS } }))

    const result = await getRecord(NAME, { functionName: 'addr', args: [NODE] })

    expect(result).toBe(ETH_ADDRESS)
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

  it('returns the zero address for a coin type neither source maps yet', async () => {
    resolveSuins.mockResolvedValue(null)
    resolveNamespace.mockResolvedValue(namespaceRecord({ addresses: { '60': ETH_ADDRESS } }))

    const result = await getRecord(NAME, { functionName: 'addr', args: [NODE, 0n] })

    expect(result).toBe(zeroAddress)
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
})
