import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'
import { isWinbackEligible, isValidCronSecret, WINBACK_MESSAGE, offerKeyboard } from '@/lib/telegram-funnel'
import { sendMessage } from '@/lib/telegram-api'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!isValidCronSecret(authHeader, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: candidates, error } = await supabase
    .from('telegram_leads')
    .select('telegram_id, start_param, created_at, clicked_checkout_at, winback_sent_at')
    .is('clicked_checkout_at', null)
    .is('winback_sent_at', null)

  if (error) {
    console.error('cron-winback query failed', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const now = new Date()
  const eligible = (candidates ?? []).filter((lead) =>
    isWinbackEligible(lead.created_at, lead.clicked_checkout_at, lead.winback_sent_at, now),
  )

  for (const lead of eligible) {
    // Claim before send: the conditional update is the atomic gate. If two
    // overlapping invocations (manual re-trigger, duplicate deploy hitting
    // this URL) both select the same lead, only one can win this update
    // (`.is('winback_sent_at', null)` matches 0 rows for the loser), so only
    // one ever sends. Sending first and claiming after (the original order)
    // let both invocations send before either claimed anything.
    const { data: claimed, error: claimError } = await supabase
      .from('telegram_leads')
      .update({ winback_sent_at: now.toISOString() })
      .eq('telegram_id', lead.telegram_id)
      .is('winback_sent_at', null)
      .select('telegram_id')

    if (claimError) {
      console.error('telegram_leads winback_sent_at claim failed', claimError)
      continue
    }
    if (!claimed || claimed.length === 0) {
      // Already claimed by a concurrent run — skip to avoid a duplicate send.
      continue
    }

    try {
      await sendMessage(
        lead.telegram_id,
        WINBACK_MESSAGE,
        offerKeyboard(lead.start_param),
      )
    } catch (err) {
      // sendMessage already swallows HTTP-level failures internally; this
      // catches the rarer throw (missing token, network-level fetch error)
      // so one bad send can't abort the rest of today's batch. The lead is
      // already claimed, so it won't retry tomorrow — acceptable for a v1
      // win-back where duplicate sends are worse than an occasional miss.
      console.error('sendMessage threw for winback', err)
    }
  }

  return NextResponse.json({ sent: eligible.length })
}
