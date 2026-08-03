/**
 * Check what a SUINS avatar object ID actually contains on-chain.
 */
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client'

const client = new SuiClient({ url: getFullnodeUrl('mainnet') })

const objectId = process.argv[2] || '0x93835f02ddb5d19f111d6c3da5c0cccc095d0848cd25e555ac39755cdda3d4a7'

async function main() {
  console.log(`Fetching Sui object: ${objectId}\n`)

  const obj = await client.getObject({
    id: objectId,
    options: {
      showContent: true,
      showDisplay: true,
      showType: true,
    },
  })

  console.log('Type:', obj.data?.type)
  console.log('\nDisplay:')
  console.log(JSON.stringify(obj.data?.display, null, 2))
  console.log('\nContent:')
  console.log(JSON.stringify(obj.data?.content, null, 2))
}

main().catch(console.error)
