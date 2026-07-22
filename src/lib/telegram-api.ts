import type { InlineButton } from './telegram-funnel'

const TELEGRAM_API_BASE = 'https://api.telegram.org'

function botUrl(method: string): string {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set')
  return `${TELEGRAM_API_BASE}/bot${token}/${method}`
}

export async function sendMessage(
  chatId: number,
  text: string,
  keyboard?: InlineButton[][],
): Promise<void> {
  const body: Record<string, unknown> = { chat_id: chatId, text }
  if (keyboard) body.reply_markup = { inline_keyboard: keyboard }

  const res = await fetch(botUrl('sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    console.error('sendMessage failed', await res.text())
  }
}

export async function answerCallbackQuery(callbackQueryId: string): Promise<void> {
  const res = await fetch(botUrl('answerCallbackQuery'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId }),
  })
  if (!res.ok) {
    console.error('answerCallbackQuery failed', await res.text())
  }
}
