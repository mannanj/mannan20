// @ts-ignore OpenNext creates this module during cf:build; clean CI typechecks before that build.
import openNextWorker from './.open-next/worker.js'

import { canonicalRedirectUrl } from './src/lib/canonical-origin'
import { STREAM_PREFIX, handleStream, type StreamEnv } from './src/lib/download-stream'

function withStrictTransportSecurity(response: Response): Response {
  const headers = new Headers(response.headers)
  headers.set('strict-transport-security', 'max-age=31536000')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export default {
  async fetch(...args: Parameters<typeof openNextWorker.fetch>) {
    const [request, env] = args
    const redirectUrl = canonicalRedirectUrl(request.url)
    if (redirectUrl) return Response.redirect(redirectUrl, 308)

    const requestUrl = new URL(request.url)
    if (requestUrl.pathname.startsWith(STREAM_PREFIX)) {
      return withStrictTransportSecurity(await handleStream(request, env as unknown as StreamEnv))
    }

    if (request.method === 'GET' || request.method === 'HEAD') {
      const assetResponse = await (env as CloudflareProductionEnv).ASSETS.fetch(request)
      if (assetResponse.status !== 404) return withStrictTransportSecurity(assetResponse)
    }

    const response = await openNextWorker.fetch(...args)
    if (requestUrl.hostname !== 'mannan.is') return response
    return withStrictTransportSecurity(response)
  },
}
