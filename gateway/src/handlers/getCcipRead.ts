import { IRequest } from 'itty-router'
import { isAddress, isHex } from 'viem/utils'
import { z } from 'zod'

import { getRecord } from '../ccip-read/query'
import {
  decodeEnsOffchainRequest,
  encodeEnsOffchainResponse,
} from '../ccip-read/utils'
import { Env } from '../env'

const schema = z.object({
  sender: z.string().refine((data) => isAddress(data)),
  data: z.string().refine((data) => isHex(data)),
})

/**
 * EIP-3668 CCIP-Read handler.
 * Called by ENS clients when resolving subnames of pushx.eth.
 */
export const getCcipRead = async (request: IRequest, env: Env) => {
  const safeParse = schema.safeParse(request.params)

  if (!safeParse.success) {
    return Response.json({ error: safeParse.error }, { status: 400 })
  }

  let result: string

  try {
    const { name, query } = decodeEnsOffchainRequest(safeParse.data)
    result = await getRecord(name, query)
  } catch (error) {
    const errMessage =
      error instanceof Error ? error.message : 'Unable to resolve'
    return Response.json({ message: errMessage }, { status: 400 })
  }

  const encodedResponse = await encodeEnsOffchainResponse(
    safeParse.data,
    result,
    env.PRIVATE_KEY
  )

  return Response.json({ data: encodedResponse }, { status: 200 })
}
