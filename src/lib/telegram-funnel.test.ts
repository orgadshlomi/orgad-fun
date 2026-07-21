import { describe, it, expect } from 'vitest'
import { parseStartParam, buildCheckoutUrl } from './telegram-funnel'

describe('parseStartParam', () => {
  it('extracts the payload after /start', () => {
    expect(parseStartParam('/start tgads_w1')).toBe('tgads_w1')
  })

  it('returns null for bare /start with no payload', () => {
    expect(parseStartParam('/start')).toBe(null)
  })

  it('returns null for non-start messages', () => {
    expect(parseStartParam('hello')).toBe(null)
  })
})

describe('buildCheckoutUrl', () => {
  it('builds a UTM-tagged checkout URL from a start param', () => {
    const url = buildCheckoutUrl('tgads_w1')
    expect(url).toBe(
      'https://getleveraged.com/crypto/?utm_source=telegram&utm_medium=paid-social&utm_campaign=crypto-tg-test&utm_content=tgads_w1',
    )
  })

  it('falls back to "organic" content tag when there is no start param', () => {
    const url = buildCheckoutUrl(null)
    expect(url).toContain('utm_content=organic')
  })
})
