import { describe, it, expect } from 'vitest'
import { parseStartParam } from './telegram-funnel'

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
