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
