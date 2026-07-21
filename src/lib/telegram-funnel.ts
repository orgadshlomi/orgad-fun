export function parseStartParam(text: string): string | null {
  const match = text.match(/^\/start(?:\s+(\S+))?$/)
  if (!match || !match[1]) return null
  return match[1]
}

const CHECKOUT_BASE_URL = process.env.CHECKOUT_BASE_URL ?? 'https://getleveraged.com/crypto/'

export function buildCheckoutUrl(startParam: string | null): string {
  const params = new URLSearchParams({
    utm_source: 'telegram',
    utm_medium: 'paid-social',
    utm_campaign: 'crypto-tg-test',
    utm_content: startParam ?? 'organic',
  })
  return `${CHECKOUT_BASE_URL}?${params.toString()}`
}

const WINBACK_DAYS = 14
const MS_PER_DAY = 24 * 60 * 60 * 1000

export function isWinbackEligible(
  createdAt: string,
  clickedCheckoutAt: string | null,
  winbackSentAt: string | null,
  now: Date,
): boolean {
  if (clickedCheckoutAt !== null) return false
  if (winbackSentAt !== null) return false
  const daysSinceCreation = (now.getTime() - new Date(createdAt).getTime()) / MS_PER_DAY
  return daysSinceCreation >= WINBACK_DAYS
}
