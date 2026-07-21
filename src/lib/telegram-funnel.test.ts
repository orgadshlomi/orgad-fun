import { describe, it, expect } from 'vitest'
import { parseStartParam, buildCheckoutUrl, isWinbackEligible } from './telegram-funnel'

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

describe('isWinbackEligible', () => {
  const NOW = new Date('2026-07-22T12:00:00Z')

  it('is eligible exactly 14 days after creation with no click and no prior send', () => {
    expect(isWinbackEligible('2026-07-08T12:00:00Z', null, null, NOW)).toBe(true)
  })

  it('is not eligible before 14 days have passed', () => {
    expect(isWinbackEligible('2026-07-10T12:00:00Z', null, null, NOW)).toBe(false)
  })

  it('is not eligible if the user already clicked through to checkout', () => {
    expect(isWinbackEligible('2026-07-08T12:00:00Z', '2026-07-09T12:00:00Z', null, NOW)).toBe(false)
  })

  it('is not eligible if a win-back was already sent', () => {
    expect(isWinbackEligible('2026-07-08T12:00:00Z', null, '2026-07-21T12:00:00Z', NOW)).toBe(false)
  })
})
