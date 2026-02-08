/**
 * Test that decodes the CCIP-Read response to verify actual resolved values.
 * Usage: npx tsx test-decode.ts [suiname] [--prod]
 *
 * Examples:
 *   npx tsx test-decode.ts evan            → test locally
 *   npx tsx test-decode.ts evan --prod     → test production gateway
 */
import {
  decodeAbiParameters,
  decodeFunctionResult,
  encodeFunctionData,
  namehash,
  toHex,
} from 'viem'

const isProd = process.argv.includes('--prod')
const GATEWAY_URL = isProd
  ? 'https://suins-ens-gateway.happys1ngh.workers.dev'
  : 'http://localhost:8787'
const SENDER = '0x0000000000000000000000000000000000000001' as const

const suiName = process.argv.filter(a => !a.startsWith('--'))[2] || 'suins'
const TEST_NAME = `${suiName}.pushx.eth`

function dnsEncodeName(name: string): `0x${string}` {
  const labels = name.split('.')
  let encoded = new Uint8Array(0)
  for (const label of labels) {
    const labelBytes = new TextEncoder().encode(label)
    const part = new Uint8Array(1 + labelBytes.length)
    part[0] = labelBytes.length
    part.set(labelBytes, 1)
    const combined = new Uint8Array(encoded.length + part.length)
    combined.set(encoded)
    combined.set(part, encoded.length)
    encoded = combined
  }
  const final = new Uint8Array(encoded.length + 1)
  final.set(encoded)
  final[encoded.length] = 0
  return toHex(final)
}

async function query(
  innerAbi: any[],
  functionName: string,
  args: any[]
): Promise<string> {
  const node = namehash(TEST_NAME)
  const dnsName = dnsEncodeName(TEST_NAME)

  const innerCalldata = encodeFunctionData({
    abi: innerAbi,
    functionName,
    args: [node, ...args],
  })

  const outerCalldata = encodeFunctionData({
    abi: [{
      name: 'resolve', type: 'function', stateMutability: 'view',
      inputs: [{ name: 'name', type: 'bytes' }, { name: 'data', type: 'bytes' }],
      outputs: [{ name: 'result', type: 'bytes' }, { name: 'expires', type: 'uint64' }, { name: 'sig', type: 'bytes' }],
    }],
    functionName: 'resolve',
    args: [dnsName, innerCalldata],
  })

  const url = `${GATEWAY_URL}/lookup/${SENDER}/${outerCalldata}.json`
  const res = await fetch(url)
  const json = await res.json() as any

  if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(json)}`)

  const [resultBytes] = decodeAbiParameters(
    [{ name: 'result', type: 'bytes' }, { name: 'expires', type: 'uint64' }, { name: 'sig', type: 'bytes' }],
    json.data
  )

  const decoded = decodeFunctionResult({
    abi: innerAbi,
    functionName,
    data: resultBytes as `0x${string}`,
  })

  return decoded as string
}

const addrAbi = [{
  name: 'addr', type: 'function', stateMutability: 'view',
  inputs: [{ name: 'node', type: 'bytes32' }, { name: 'coinType', type: 'uint256' }],
  outputs: [{ name: '', type: 'bytes' }],
}]

const textAbi = [{
  name: 'text', type: 'function', stateMutability: 'view',
  inputs: [{ name: 'node', type: 'bytes32' }, { name: 'key', type: 'string' }],
  outputs: [{ name: '', type: 'string' }],
}]

async function main() {
  console.log(`\n=== Resolving: ${TEST_NAME} (SUINS: ${suiName}.sui) ===`)
  console.log(`Gateway: ${GATEWAY_URL}\n`)

  const suiAddr = await query(addrAbi, 'addr', [784n])
  console.log(`addr(784) SUI address: ${suiAddr}`)

  const originalName = await query(textAbi, 'text', ['org.suins.name'])
  console.log(`text("org.suins.name"): ${originalName}`)

  const avatar = await query(textAbi, 'text', ['avatar'])
  console.log(`text("avatar"): ${avatar || '(empty)'}`)

  const walrus = await query(textAbi, 'text', ['walrusSiteId'])
  console.log(`text("walrusSiteId"): ${walrus || '(empty)'}`)

  console.log('')
}

main().catch(console.error)
