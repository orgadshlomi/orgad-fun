import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'
import {
  parseStartParam,
  isValidWebhookSecret,
  offerMessage,
  offerKeyboard,
} from '@/lib/telegram-funnel'
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

  // First-touch attribution: ignoreDuplicates means a repeat /start keeps the
  // original start_param/username. Best-effort write — a DB hiccup here must
  // never block the offer below.
  //
  // offer_sent_at is stamped here now that the offer is the first message
  // (22-Sep-2026). It used to be stamped on the Q2 answer; the funnel no longer
  // has questions, so start and offer are the same moment. Pre-22-Sep rows keep
  // the old meaning — compare periods with that in mind.
  const { error } = await supabase.from('telegram_leads').upsert(
    {
      telegram_id: telegramId,
      username: update.from.username ?? null,
      language_code: update.from.language_code ?? null,
      start_param: startParam,
      offer_sent_at: new Date().toISOString(),
    },
    { onConflict: 'telegram_id', ignoreDuplicates: true },
  )
  if (error) {
    console.error('telegram_leads upsert failed', error)
  }

  await sendMessage(update.chat.id, offerMessage(), offerKeyboard(telegramId))
}

async function handleCallback(cq: NonNullable<TelegramUpdate['callback_query']>) {
  const chatId = cq.message.chat.id
  const telegramId = cq.from.id
  const data = cq.data ?? ''

  await answerCallbackQuery(cq.id)

  // Legacy Q1/Q2 buttons (pre-22-Sep). Those keyboards still sit in old chat
  // histories, so a tap must not dead-end — just serve the offer.
  if (data.startsWith('q1:') || data.startsWith('q2:')) {
    const { error } = await supabase
      .from('telegram_leads')
      .update({ offer_sent_at: new Date().toISOString() })
      .eq('telegram_id', telegramId)
      .is('offer_sent_at', null)
    if (error) {
      console.error('telegram_leads legacy-callback update failed', error)
    }
    await sendMessage(chatId, offerMessage(), offerKeyboard(telegramId))
    return
  }
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-telegram-bot-api-secret-token')
  if (!isValidWebhookSecret(secret, process.env.TELEGRAM_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const update: TelegramUpdate = await req.json()

  try {
    if (update.message?.text?.startsWith('/start')) {
      await handleStart(update.message)
    } else if (update.callback_query) {
      await handleCallback(update.callback_query)
    }
  } catch (err) {
    console.error('webhook error', err)
  }

  // Always 200 so Telegram doesn't retry-storm on transient errors
  return NextResponse.json({ ok: true })
}
