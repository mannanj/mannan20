import { describe, expect, test } from 'bun:test'

import { canonicalRedirectUrl } from './canonical-origin'

describe('canonicalRedirectUrl', () => {
  test('upgrades the apex to HTTPS', () => {
    expect(canonicalRedirectUrl('http://mannan.is/garden?view=all')).toBe(
      'https://mannan.is/garden?view=all',
    )
  })

  test('redirects www to the HTTPS apex', () => {
    expect(canonicalRedirectUrl('https://www.mannan.is/game')).toBe('https://mannan.is/game')
    expect(canonicalRedirectUrl('http://www.mannan.is/')).toBe('https://mannan.is/')
  })

  test('leaves the canonical HTTPS URL alone', () => {
    expect(canonicalRedirectUrl('https://mannan.is/')).toBeNull()
  })

  test('does not rewrite Worker preview hostnames', () => {
    expect(canonicalRedirectUrl('https://mannan20-site.mannanteam.workers.dev/')).toBeNull()
  })
})
