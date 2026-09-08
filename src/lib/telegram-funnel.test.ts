import { describe, it, expect } from 'vitest'
import {
  parseStartParam,
  buildCheckoutUrl,
  buildTrackedCheckoutUrl,
  offerKeyboard,
  isWinbackEligible,
  isValidWebhookSecret,
  isValidCronSecret,
} from './telegram-funnel'

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
  // Hyros support (07-Sep-2026): paid traffic should carry `sl` only, with no
  // UTMs competing as a second attribution signal.
  it('sends sl only, with no UTM params', () => {
    expect(buildCheckoutUrl()).toBe('https://getleveraged.com/crypto/?sl=telegram')
  })

  it('carries no utm_ params at all', () => {
    expect(buildCheckoutUrl()).not.toContain('utm_')
  })
})

describe('buildTrackedCheckoutUrl', () => {
  it('builds a minimal tracking hop carrying only the telegram id', () => {
    expect(buildTrackedCheckoutUrl(8766903940)).toBe(
      'https://getleveraged.vercel.app/g?t=8766903940',
    )
  })

  it("exposes nothing beyond the id, so Telegram's link dialog stays short", () => {
    const url = buildTrackedCheckoutUrl(123)
    expect(url).not.toContain('utm_')
    expect(url).not.toContain('sl=')
    expect(url).not.toContain('tgads')
  })
})

describe('offerKeyboard', () => {
  it('points the CTA at the tracking hop rather than straight to checkout', () => {
    const [[button]] = offerKeyboard(8766903940)
    expect(button.text).toBe('Start My Challenge →')
    expect(button.url).toBe('https://getleveraged.vercel.app/g?t=8766903940')
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

describe('isValidWebhookSecret', () => {
  it('accepts a header that matches the expected secret', () => {
    expect(isValidWebhookSecret('correct-secret', 'correct-secret')).toBe(true)
  })

  it('rejects a header that does not match', () => {
    expect(isValidWebhookSecret('wrong-secret', 'correct-secret')).toBe(false)
  })

  it('rejects a missing header', () => {
    expect(isValidWebhookSecret(null, 'correct-secret')).toBe(false)
  })

  it('rejects when the expected secret is not configured', () => {
    expect(isValidWebhookSecret('anything', undefined)).toBe(false)
  })
})

describe('isValidCronSecret', () => {
  it('accepts a correctly-formatted bearer header matching the secret', () => {
    expect(isValidCronSecret('Bearer correct-secret', 'correct-secret')).toBe(true)
  })

  it('rejects a header with the wrong secret', () => {
    expect(isValidCronSecret('Bearer wrong-secret', 'correct-secret')).toBe(false)
  })

  it('rejects a missing header', () => {
    expect(isValidCronSecret(null, 'correct-secret')).toBe(false)
  })

  it('rejects when the expected secret is not configured', () => {
    expect(isValidCronSecret('Bearer anything', undefined)).toBe(false)
  })
})
