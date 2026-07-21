import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'
import { parseStartParam, WELCOME_MESSAGE, Q1_KEYBOARD } from '@/lib/telegram-funnel'
import { sendMessage, answerCallbackQuery } from '@/lib/telegram-api'

type TelegramUpdate = {
  message?: {
    text?: string
    chat: { id: number }
    from: { id: number; username?: string; language_code?: string }
  }
  callback_query?: {
    id: string
    data?: string
    message: { chat: { id: number } }
    from: { id: number }
  }
}

async function handleStart(update: NonNullable<TelegramUpdate['message']>) {
  const startParam = parseStartParam(update.text ?? '')
  const telegramId = update.from.id

  await supabase.from('telegram_leads').upsert(
    {
      telegram_id: telegramId,
      username: update.from.username ?? null,
      language_code: update.from.language_code ?? null,
      start_param: startParam,
    },
    { onConflict: 'telegram_id', ignoreDuplicates: true },
  )

  await sendMessage(update.chat.id, WELCOME_MESSAGE, Q1_KEYBOARD)
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-telegram-bot-api-secret-token')
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const update: TelegramUpdate = await req.json()

  try {
    if (update.message?.text?.startsWith('/start')) {
      await handleStart(update.message)
    }
  } catch (err) {
    console.error('webhook error', err)
  }

  // Always 200 so Telegram doesn't retry-storm on transient errors
  return NextResponse.json({ ok: true })
}
