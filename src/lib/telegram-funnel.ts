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

export type InlineButton = { text: string; callback_data?: string; url?: string }

export const WELCOME_MESSAGE =
  "Welcome to Leveraged. Quick one before we show you the Crypto Challenge: are you already trading crypto?"

export const Q1_KEYBOARD: InlineButton[][] = [
  [
    { text: 'Yes, already trading', callback_data: 'q1:yes' },
    { text: 'Not yet', callback_data: 'q1:no' },
  ],
]

export const Q2_MESSAGE = 'What size funded account are you aiming for?'

export const Q2_KEYBOARD: InlineButton[][] = [
  [
    { text: '$10k', callback_data: 'q2:10k' },
    { text: '$25k', callback_data: 'q2:25k' },
  ],
  [
    { text: '$50k', callback_data: 'q2:50k' },
    { text: '$100k+', callback_data: 'q2:100k' },
  ],
]

export function offerMessage(): string {
  return [
    'The Leveraged Crypto Challenge: prove your edge on 100+ crypto pairs, then get funded.',
    '',
    '- Entry: $8.88, pay the full fee only after you pass',
    '- Target: 6% to get funded, up to $150k',
    '- Keep 80% of the profit split, biweekly payouts',
    '',
    'Tap below to start your challenge.',
  ].join('\n')
}

export function offerKeyboard(startParam: string | null, telegramId: number): InlineButton[][] {
  const goUrl = new URL('https://orgad.fun/api/telegram/go')
  goUrl.searchParams.set('tid', String(telegramId))
  if (startParam) goUrl.searchParams.set('start', startParam)
  return [[{ text: 'Start My Challenge →', url: goUrl.toString() }]]
}

export const WINBACK_MESSAGE =
  "Still thinking about it? The Leveraged Crypto Challenge is still $8.88 to start, pay the rest only if you pass. Tap below when you're ready."
