import { describe, expect, it } from 'vitest'

import { selectRecordValue } from '../precedence'

const NODE = `0x${'0'.repeat(64)}` as const
const SUI_ADDRESS = `0x${'1'.repeat(64)}`
const ETH_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
const SOL_ADDRESS = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'

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

describe('selectRecordValue addr', () => {
  it('coin 784 is SuiNS-only', () => {
    const suins = suinsRecord({ targetAddress: SUI_ADDRESS })
    const namespace = namespaceRecord({ addresses: { '784': 'ignored' } })

    expect(
      selectRecordValue({ functionName: 'addr', args: [NODE, 784n] }, suins, namespace)
    ).toBe(SUI_ADDRESS)
  })

  it('every other coin type comes from Namespace', () => {
    const namespace = namespaceRecord({ addresses: { '501': SOL_ADDRESS } })

    expect(
      selectRecordValue({ functionName: 'addr', args: [NODE, 501n] }, null, namespace)
    ).toBe(SOL_ADDRESS)
  })

  it('addr(node) with no coinType defaults to coin 60 from Namespace', () => {
    const namespace = namespaceRecord({ addresses: { '60': ETH_ADDRESS } })

    expect(selectRecordValue({ functionName: 'addr', args: [NODE] }, null, namespace)).toBe(
      ETH_ADDRESS
    )
  })

  it('is empty when neither source has the requested coin type', () => {
    expect(
      selectRecordValue({ functionName: 'addr', args: [NODE, 60n] }, null, null)
    ).toBe('')
  })
})

describe('selectRecordValue text', () => {
  it('avatar: a non-empty SuiNS value wins over Namespace', () => {
    const suins = suinsRecord({ avatar: 'https://sui.example/a.png' })
    const namespace = namespaceRecord({ texts: { avatar: 'https://namespace.example/a.png' } })

    expect(
      selectRecordValue({ functionName: 'text', args: [NODE, 'avatar'] }, suins, namespace)
    ).toBe('https://sui.example/a.png')
  })

  it('avatar: Namespace is a fallback when SuiNS has none', () => {
    const namespace = namespaceRecord({ texts: { avatar: 'https://namespace.example/a.png' } })

    expect(
      selectRecordValue({ functionName: 'text', args: [NODE, 'avatar'] }, null, namespace)
    ).toBe('https://namespace.example/a.png')
  })

  it('avatar: empty when both sources have none', () => {
    expect(
      selectRecordValue({ functionName: 'text', args: [NODE, 'avatar'] }, null, null)
    ).toBe('')
  })

  it.each(['contentHash', 'walrusSiteId', 'walrus'])(
    '%s is SuiNS-only and ignores any Namespace value',
    (key) => {
      const suins = suinsRecord({ contentHash: 'sui-value', walrusSiteId: 'sui-value' })
      const namespace = namespaceRecord({ texts: { [key]: 'namespace-value' } })

      expect(
        selectRecordValue({ functionName: 'text', args: [NODE, key] }, suins, namespace)
      ).toBe('sui-value')
    }
  )

  it('every other text key comes from Namespace', () => {
    const namespace = namespaceRecord({ texts: { 'com.twitter': 'happysingh' } })

    expect(
      selectRecordValue({ functionName: 'text', args: [NODE, 'com.twitter'] }, null, namespace)
    ).toBe('happysingh')
  })

  it('is empty when neither source has the requested key', () => {
    expect(
      selectRecordValue({ functionName: 'text', args: [NODE, 'com.twitter'] }, null, null)
    ).toBe('')
  })
})

describe('selectRecordValue contenthash', () => {
  it('a non-empty SuiNS value wins over Namespace', () => {
    const suins = suinsRecord({ contentHash: 'sui-cid' })
    const namespace = namespaceRecord({ contenthash: 'namespace-cid' })

    expect(selectRecordValue({ functionName: 'contenthash', args: [NODE] }, suins, namespace)).toBe(
      'sui-cid'
    )
  })

  it('Namespace is a fallback when SuiNS has none', () => {
    const namespace = namespaceRecord({ contenthash: 'namespace-cid' })

    expect(selectRecordValue({ functionName: 'contenthash', args: [NODE] }, null, namespace)).toBe(
      'namespace-cid'
    )
  })

  it('is empty when both sources have none', () => {
    expect(selectRecordValue({ functionName: 'contenthash', args: [NODE] }, null, null)).toBe('')
  })
})
