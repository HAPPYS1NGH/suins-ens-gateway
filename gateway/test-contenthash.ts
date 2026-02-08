import { decodeAbiParameters, decodeFunctionResult, encodeFunctionData, namehash, toHex, fromHex } from 'viem'
import { CID } from 'multiformats/cid'
import { base32 } from 'multiformats/bases/base32'

const isProd = process.argv.includes('--prod')
const GATEWAY = isProd
  ? 'https://suins-ens-gateway.happys1ngh.workers.dev'
  : 'http://localhost:8787'
const SENDER = '0x0000000000000000000000000000000000000001' as const
const suiName = process.argv.filter(a => !a.startsWith('--'))[2] || 'happysingh'
const name = `${suiName}.onsui.eth`

function dnsEncodeName(n: string): `0x${string}` {
  const labels = n.split('.')
  let encoded = new Uint8Array(0)
  for (const label of labels) {
    const lb = new TextEncoder().encode(label)
    const part = new Uint8Array(1 + lb.length)
    part[0] = lb.length
    part.set(lb, 1)
    const combined = new Uint8Array(encoded.length + part.length)
    combined.set(encoded)
    combined.set(part, encoded.length)
    encoded = combined
  }
  const final = new Uint8Array(encoded.length + 1)
  final.set(encoded)
  return toHex(final)
}

const chAbi = [{ name: 'contenthash', type: 'function', stateMutability: 'view', inputs: [{ name: 'node', type: 'bytes32' }], outputs: [{ name: '', type: 'bytes' }] }] as const

async function main() {
  console.log(`\n=== contenthash for ${name} ===`)
  console.log(`Gateway: ${GATEWAY}\n`)

  const node = namehash(name)
  const dnsName = dnsEncodeName(name)

  const inner = encodeFunctionData({ abi: chAbi, functionName: 'contenthash', args: [node] })
  const outer = encodeFunctionData({
    abi: [{ name: 'resolve', type: 'function', stateMutability: 'view', inputs: [{ name: 'name', type: 'bytes' }, { name: 'data', type: 'bytes' }], outputs: [{ name: 'result', type: 'bytes' }, { name: 'expires', type: 'uint64' }, { name: 'sig', type: 'bytes' }] }] as const,
    functionName: 'resolve',
    args: [dnsName, inner],
  })

  const res = await fetch(`${GATEWAY}/lookup/${SENDER}/${outer}.json`)
  const json = await res.json() as any
  const [resultBytes] = decodeAbiParameters(
    [{ name: 'result', type: 'bytes' }, { name: 'expires', type: 'uint64' }, { name: 'sig', type: 'bytes' }],
    json.data
  )
  const decoded = decodeFunctionResult({ abi: chAbi, functionName: 'contenthash', data: resultBytes as `0x${string}` }) as `0x${string}`

  console.log(`Raw hex: ${decoded}`)

  if (decoded && decoded !== '0x') {
    const bytes = fromHex(decoded, 'bytes')

    // Check namespace prefix
    if (bytes[0] === 0xe3 && bytes[1] === 0x01) {
      console.log(`Namespace: ipfs-ns (0xe301)`)
      // CID bytes start after the 2-byte namespace
      const cidBytes = bytes.slice(2)
      const cid = CID.decode(cidBytes)
      const cidStr = cid.toString(base32)
      console.log(`CID: ${cidStr}`)
      console.log(`IPFS URL: https://ipfs.io/ipfs/${cidStr}`)
      console.log(`dweb URL: ipfs://${cidStr}`)
    } else if (bytes[0] === 0xe5 && bytes[1] === 0x01) {
      console.log(`Namespace: ipns-ns (0xe501)`)
    } else {
      console.log(`Unknown namespace: 0x${bytes[0].toString(16)}${bytes[1].toString(16)}`)
    }
  } else {
    console.log('(empty)')
  }

  console.log('')
}

main().catch(console.error)
