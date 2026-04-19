import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  getDayInfo,
  getCurrentWeek,
  formatHebrewDate,
  toISODate,
  PROTEIN_CHECKPOINTS,
} from '@/lib/fitness-logic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

async function sendSlack(text: string) {
  const url = process.env.SLACK_WEBHOOK_URL
  if (!url) return
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { type } = await req.json().catch(() => ({ type: 'morning' }))
  const now = new Date()
  const today = toISODate(now)
  const dayInfo = getDayInfo(now)
  const week = getCurrentWeek(now)
  const hebrewDate = formatHebrewDate(now)

  const { data: log } = await supabase
    .from('fitness_daily_logs')
    .select('*')
    .eq('date', today)
    .maybeSingle()

  let message = ''

  if (type === 'morning') {
    message = [
      `🌅 *בוקר טוב שלומי!*`,
      ``,
      `📅 *${hebrewDate} | שבוע ${week} מתוך 6*`,
      `${dayInfo.emoji} *סוג יום:* ${dayInfo.label}`,
      `🏃 *אימון:* ${dayInfo.workout}`,
      ``,
      `🎯 *יעדי היום:*`,
      `• קלוריות: ${dayInfo.calTarget.toLocaleString()} קק"ל`,
      `• חלבון: ${dayInfo.proteinTarget} גרם`,
      `• פחמימות: ${dayInfo.carbTarget} גרם`,
      ``,
      `⏰ *נקודות בקרה לחלבון:*`,
      ...PROTEIN_CHECKPOINTS.map(cp => `□ ${cp.target}g ${cp.label}`),
      ``,
      `💪 יאללה, יום מצוין! 🔗 https://orgad.fun/fitness`,
    ].join('\n')
  } else if (type === 'afternoon') {
    const protein = log?.protein_g ?? 0
    const cp = PROTEIN_CHECKPOINTS[1]
    const ok = protein >= cp.target
    message = [
      `⏰ *בדיקת חלבון 15:00 — שלומי*`,
      ``,
      ok
        ? `✅ כל הכבוד! כבר ${protein}g חלבון — על הדרך הנכונה!`
        : `⚠️ רק ${protein}g חלבון עד כה — יעד: ${cp.target}g עד 15:00`,
      ``,
      `📊 יעד יומי: ${dayInfo.proteinTarget}g | נשאר: ${Math.max(0, dayInfo.proteinTarget - protein)}g`,
      `🔗 https://orgad.fun/fitness/log`,
    ].join('\n')
  } else if (type === 'evening') {
    const protein = log?.protein_g ?? 0
    const calories = log?.calories_kcal ?? 0
    const workoutDone = log?.workout_done ?? false
    const remaining = Math.max(0, dayInfo.proteinTarget - protein)

    message = [
      `🌙 *סיכום יום — שלומי*`,
      ``,
      `📅 ${hebrewDate}`,
      ``,
      `📊 *מה נרשם היום:*`,
      `🥗 ארוחת בוקר: ${log?.breakfast_type ? `וריאציה ${log.breakfast_type}` : 'לא נרשם'}`,
      `🍽️ צהריים: ${log?.lunch_option ?? 'לא נרשם'}`,
      `🌙 ערב: ${log?.dinner_option ?? 'לא נרשם'}`,
      `${workoutDone ? '✅' : '❌'} אימון: ${workoutDone ? dayInfo.workout : 'לא בוצע'}`,
      ``,
      `💪 חלבון: *${protein}g* / ${dayInfo.proteinTarget}g`,
      `🔥 קלוריות: *${calories}* / ${dayInfo.calTarget}`,
      remaining > 0
        ? `\n⚠️ עוד *${remaining}g חלבון* לפני שינה!`
        : `\n✅ יעד החלבון הושג! מעולה!`,
      ``,
      `🔗 https://orgad.fun/fitness`,
    ].join('\n')
  }

  await sendSlack(message)
  return NextResponse.json({ ok: true, type })
}

// Called by Vercel cron
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const hour = new Date().getUTCHours() + 3 // Israel time (UTC+3)
  const type = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  const mockReq = new Request(req.url, {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type }),
  })
  return POST(mockReq as NextRequest)
}
