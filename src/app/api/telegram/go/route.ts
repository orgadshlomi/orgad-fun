import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'
import { buildCheckoutUrl } from '@/lib/telegram-funnel'

export async function GET(req: NextRequest) {
  const tid = req.nextUrl.searchParams.get('tid')
  const startParam = req.nextUrl.searchParams.get('start')
  const checkoutUrl = buildCheckoutUrl(startParam)

  // Best-effort click tracking — a DB hiccup here must never block the redirect.
  if (tid) {
    const telegramId = Number(tid)
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
