export function parseStartParam(text: string): string | null {
  const match = text.match(/^\/start(?:\s+(\S+))?$/)
  if (!match || !match[1]) return null
  return match[1]
}

const CHECKOUT_BASE_URL = process.env.CHECKOUT_BASE_URL ?? 'https://getleveraged.com/crypto/'

// `sl` only, no UTMs — per Hyros support (07-Sep-2026): for *paid* traffic they
// want the bare `?sl` so attribution runs through their source layer alone,
// without UTMs adding competing attribution signals. UTMs are their advice for
// unpaid traffic only. Losing utm_content costs us nothing now: the per-concept
// breakdown comes from our own `telegram_leads.start_param` via the /g hop,
// which is more granular than Hyros could ever report anyway.
// Single param also sidesteps the getleveraged.com redirect that strips
// anything following `sl=`.
export function buildCheckoutUrl(): string {
  return `${CHECKOUT_BASE_URL}?sl=telegram`
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

export function isValidWebhookSecret(
  headerValue: string | null,
  expectedSecret: string | undefined,
): boolean {
  if (!expectedSecret) return false
  return headerValue === expectedSecret
}

export function isValidCronSecret(
  authHeader: string | null,
  expectedSecret: string | undefined,
): boolean {
  if (!expectedSecret) return false
  return authHeader === `Bearer ${expectedSecret}`
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

// Host of the click-tracking hop. Kept in an env var so it can be moved to a
// branded domain (e.g. go.getleveraged.com) without a code change — Telegram's
// "Open link?" dialog shows this host, so a branded one reads better mid-purchase.
const CLICK_TRACK_BASE_URL =
  process.env.CLICK_TRACK_BASE_URL ?? 'https://getleveraged.vercel.app'

// Deliberately terse (`/g?t=…`): Telegram's confirmation dialog shows the whole
// URL right before a purchase decision, so this carries the bare minimum. The
// telegram id is all the hop needs — it stamps the click on that lead row, and
// the concept is already stored there as `start_param` from /start, so it never
// has to travel in the URL.
export function buildTrackedCheckoutUrl(telegramId: number): string {
  return `${CLICK_TRACK_BASE_URL}/g?t=${telegramId}`
}

export function offerKeyboard(telegramId: number): InlineButton[][] {
  return [[{ text: 'Start My Challenge →', url: buildTrackedCheckoutUrl(telegramId) }]]
}

export const WINBACK_MESSAGE =
  "Still thinking about it? The Leveraged Crypto Challenge is still $8.88 to start, pay the rest only if you pass. Tap below when you're ready."
