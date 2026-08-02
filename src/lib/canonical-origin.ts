const APEX_HOSTNAME = 'mannan.is'
const WWW_HOSTNAME = `www.${APEX_HOSTNAME}`

export function canonicalRedirectUrl(requestUrl: string): string | null {
  const url = new URL(requestUrl)
  if (url.hostname !== APEX_HOSTNAME && url.hostname !== WWW_HOSTNAME) return null

  const needsHttps = url.protocol !== 'https:'
  const needsApex = url.hostname === WWW_HOSTNAME
  if (!needsHttps && !needsApex) return null

  url.protocol = 'https:'
  url.hostname = APEX_HOSTNAME
  url.port = ''
  return url.toString()
}
