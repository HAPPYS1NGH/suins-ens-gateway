/**
 * Test script to verify the SUINS-ENS gateway resolves names correctly.
 * Simulates what an ENS client would do via CCIP-Read.
 *
 * Usage: npx tsx test.ts
 */
import {
  encodeFunctionData,
  namehash,
  toBytes,
  toHex,
} from 'viem'

const GATEWAY_URL = 'http://localhost:8787'

// A dummy sender address (the resolver contract address)
const SENDER = '0x0000000000000000000000000000000000000001'

// The name to test — change this to any real SUINS name
const TEST_NAME = 'suins.pushx.eth'

// SUI coin type
const SUI_COIN_TYPE = 784n

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

  // Add null terminator
  const final = new Uint8Array(encoded.length + 1)
  final.set(encoded)
  final[encoded.length] = 0

  return toHex(final)
}

async function testResolve(name: string, coinType: bigint) {
  console.log(`\nResolving: ${name} (coinType: ${coinType})`)
  console.log('---')

  const node = namehash(name)
  const dnsName = dnsEncodeName(name)

  // Encode the inner resolver call: addr(node, coinType)
  const innerCalldata = encodeFunctionData({
    abi: [
      {
        name: 'addr',
        type: 'function',
        stateMutability: 'view',
        inputs: [
          { name: 'node', type: 'bytes32' },
          { name: 'coinType', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bytes' }],
      },
    ],
    functionName: 'addr',
    args: [node, coinType],
  })

  // Encode the outer resolve call: resolve(dnsName, innerCalldata)
  const outerCalldata = encodeFunctionData({
    abi: [
      {
        name: 'resolve',
        type: 'function',
        stateMutability: 'view',
        inputs: [
          { name: 'name', type: 'bytes' },
          { name: 'data', type: 'bytes' },
        ],
        outputs: [
          { name: 'result', type: 'bytes' },
          { name: 'expires', type: 'uint64' },
          { name: 'sig', type: 'bytes' },
        ],
      },
    ],
    functionName: 'resolve',
    args: [dnsName, innerCalldata],
  })

  const url = `${GATEWAY_URL}/lookup/${SENDER}/${outerCalldata}.json`
  console.log(`GET ${url.substring(0, 80)}...`)

  const response = await fetch(url)
  const json = await response.json() as any

  if (response.ok) {
    console.log(`Status: ${response.status} OK`)
    console.log(`Response data: ${JSON.stringify(json.data).substring(0, 120)}...`)
  } else {
    console.log(`Status: ${response.status}`)
    console.log(`Error: ${JSON.stringify(json)}`)
  }
}

async function testTextRecord(name: string, key: string) {
  console.log(`\nResolving text: ${name} key="${key}"`)
  console.log('---')

  const node = namehash(name)
  const dnsName = dnsEncodeName(name)

  const innerCalldata = encodeFunctionData({
    abi: [
      {
        name: 'text',
        type: 'function',
        stateMutability: 'view',
        inputs: [
          { name: 'node', type: 'bytes32' },
          { name: 'key', type: 'string' },
        ],
        outputs: [{ name: '', type: 'string' }],
      },
    ],
    functionName: 'text',
    args: [node, key],
  })

  const outerCalldata = encodeFunctionData({
    abi: [
      {
        name: 'resolve',
        type: 'function',
        stateMutability: 'view',
        inputs: [
          { name: 'name', type: 'bytes' },
          { name: 'data', type: 'bytes' },
        ],
        outputs: [
          { name: 'result', type: 'bytes' },
          { name: 'expires', type: 'uint64' },
          { name: 'sig', type: 'bytes' },
        ],
      },
    ],
    functionName: 'resolve',
    args: [dnsName, innerCalldata],
  })

  const url = `${GATEWAY_URL}/lookup/${SENDER}/${outerCalldata}.json`
  const response = await fetch(url)
  const json = await response.json() as any

  if (response.ok) {
    console.log(`Status: ${response.status} OK`)
    console.log(`Response data: ${JSON.stringify(json.data).substring(0, 120)}...`)
  } else {
    console.log(`Status: ${response.status}`)
    console.log(`Error: ${JSON.stringify(json)}`)
  }
}

async function main() {
  console.log('=== SUINS-ENS Gateway Test ===')

  // Test addr resolution (SUI coin type 784)
  await testResolve(TEST_NAME, SUI_COIN_TYPE)

  // Test text record
  await testTextRecord(TEST_NAME, 'avatar')

  // Test text record for the original SUI name
  await testTextRecord(TEST_NAME, 'org.suins.name')

  console.log('\n=== Done ===')
}

main().catch(console.error)
