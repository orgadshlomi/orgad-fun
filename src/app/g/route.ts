import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'
import { buildCheckoutUrl } from '@/lib/telegram-funnel'

// Click-tracking hop for the bot's "Start My Challenge" button. Records the
// click first-party (so we have a number to compare against Hyros rather than
// depending on it), then forwards to the checkout URL.
//
// Path and params are kept minimal because Telegram's "Open link?" dialog
// renders the entire URL to the user right before a purchase decision.
// Per-concept reporting comes from telegram_leads.start_param on the stamped
// row, not from the URL — which is why only the telegram id needs to travel.
export async function GET(req: NextRequest) {
  // `s` is accepted but ignored: buttons sent before 07-Sep-2026 still carry it.
  const t = req.nextUrl.searchParams.get('t')
  const checkoutUrl = buildCheckoutUrl()

  // Best-effort: a DB hiccup must never block someone reaching checkout.
  // `.is(..., null)` keeps the first click only, so this counts unique
  // clickers rather than taps.
  if (t) {
    const telegramId = Number(t)
    if (Number.isFinite(telegramId)) {
      const { error } = await supabase
        .from('telegram_leads')
        .update({ clicked_checkout_at: new Date().toISOString() })
        .eq('telegram_id', telegramId)
        .is('clicked_checkout_at', null)
      if (error) {
        console.error('telegram_leads clicked_checkout_at update failed', error)
      }
    }
  }

  return NextResponse.redirect(checkoutUrl, 302)
}
