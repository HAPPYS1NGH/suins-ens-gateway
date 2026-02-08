import { AutoRouter, cors } from 'itty-router'

import { Env } from './env'
import { getCcipRead } from './handlers'

const { preflight, corsify } = cors()
const router = AutoRouter<any, [Env]>()

router
  .all('*', preflight)
  .get('/lookup/:sender/:data.json', getCcipRead)
  .get('/health', () => Response.json({ status: 'ok', service: 'suins-ens-gateway' }))
  .all('*', () => Response.json({ error: 'Not found' }, { status: 404 }))

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return router.fetch(request, env).then(corsify)
  },
}
