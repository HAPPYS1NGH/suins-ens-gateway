/**
 * Directly query SUINS to verify name resolution works.
 * Usage: npx tsx test-suins-direct.ts [name]
 */
import { SuinsClient } from '@mysten/suins'
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client'

const suiClient = new SuiClient({ url: getFullnodeUrl('mainnet') })
const suinsClient = new SuinsClient({ client: suiClient as any, network: 'mainnet' })

const name = (process.argv[2] || 'suins') + '.sui'

async function main() {
  console.log(`Querying SUINS for: ${name}`)
  try {
    const record = await suinsClient.getNameRecord(name)
    console.log('\nName Record:')
    console.log(JSON.stringify(record, null, 2))
  } catch (error) {
    console.error('Error:', error)
  }
}

main()
