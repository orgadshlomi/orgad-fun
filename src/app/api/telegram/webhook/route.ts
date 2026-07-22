import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'
import {
  parseStartParam,
  isValidWebhookSecret,
  WELCOME_MESSAGE,
  Q1_KEYBOARD,
  Q2_MESSAGE,
  Q2_KEYBOARD,
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
  // never block the welcome message below.
  const { error } = await supabase.from('telegram_leads').upsert(
    {
      telegram_id: telegramId,
      username: update.from.username ?? null,
      language_code: update.from.language_code ?? null,
      start_param: startParam,
    },
    { onConflict: 'telegram_id', ignoreDuplicates: true },
  )
  if (error) {
    console.error('telegram_leads upsert failed', error)
  }

  await sendMessage(update.chat.id, WELCOME_MESSAGE, Q1_KEYBOARD)
}

async function handleCallback(cq: NonNullable<TelegramUpdate['callback_query']>) {
  const chatId = cq.message.chat.id
  const telegramId = cq.from.id
  const data = cq.data ?? ''

  await answerCallbackQuery(cq.id)

  if (data.startsWith('q1:')) {
    const answer = data.split(':')[1]
    const { error } = await supabase
      .from('telegram_leads')
      .update({ qualifying_answers: { already_trading: answer } })
      .eq('telegram_id', telegramId)
    if (error) {
      console.error('telegram_leads q1 update failed', error)
    }
    await sendMessage(chatId, Q2_MESSAGE, Q2_KEYBOARD)
    return
  }

  if (data.startsWith('q2:')) {
    const answer = data.split(':')[1]
    const { data: lead, error: selectError } = await supabase
      .from('telegram_leads')
      .select('qualifying_answers, start_param')
      .eq('telegram_id', telegramId)
      .single()
    if (selectError) {
      console.error('telegram_leads q2 select failed', selectError)
    }

    const mergedAnswers = { ...(lead?.qualifying_answers ?? {}), target_size: answer }

    const { error: updateError } = await supabase
      .from('telegram_leads')
      .update({ qualifying_answers: mergedAnswers, offer_sent_at: new Date().toISOString() })
      .eq('telegram_id', telegramId)
    if (updateError) {
      console.error('telegram_leads q2 update failed', updateError)
    }

    await sendMessage(
      chatId,
      offerMessage(),
      offerKeyboard(lead?.start_param ?? null, telegramId),
    )
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
