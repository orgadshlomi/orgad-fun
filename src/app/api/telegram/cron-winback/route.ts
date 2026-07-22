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
    await sendMessage(
      lead.telegram_id,
      WINBACK_MESSAGE,
      offerKeyboard(lead.start_param, lead.telegram_id),
    )
    const { error: updateError } = await supabase
      .from('telegram_leads')
      .update({ winback_sent_at: now.toISOString() })
      .eq('telegram_id', lead.telegram_id)
    if (updateError) {
      // If this write fails, tomorrow's run will re-select the same lead and
      // resend — acceptable for a v1 win-back (favors a resend over silently
      // dropping the lead), just log it for visibility.
      console.error('telegram_leads winback_sent_at update failed', updateError)
    }
  }

  return NextResponse.json({ sent: eligible.length })
}
