import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { createHmac } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function verifySlackSignature(body: string, timestamp: string, signature: string): boolean {
  const secret = process.env.SLACK_SIGNING_SECRET
  if (!secret) return false
  const baseString = `v0:${timestamp}:${body}`
  const hmac = createHmac('sha256', secret).update(baseString).digest('hex')
  const expected = `v0=${hmac}`
  return expected === signature
}

type ParsedMeal = {
  protein_g?: number
  calories_kcal?: number
  carbs_g?: number
  workout_done?: boolean
  workout_type?: string
  weight_kg?: number
  notes?: string
}

async function parseMessage(text: string, date: string): Promise<ParsedMeal> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: `You are a fitness tracker assistant. The user will send Hebrew or English messages describing what they ate, their workout, or weight.
Extract nutritional data and return ONLY valid JSON with these optional fields:
- protein_g: number (grams of protein)
- calories_kcal: number (total calories)
- carbs_g: number (grams of carbs)
- workout_done: boolean
- workout_type: one of "gym_a", "gym_b", "swimming", "calisthenics", "rest"
- weight_kg: number
- notes: string (raw food description in Hebrew)

Nutrition estimates for common foods:
- ביצת עין / fried egg: protein 6g, calories 90, carbs 0
- אבוקדו חצי / half avocado: protein 2g, calories 120, carbs 6
- שייק חלבון / protein shake: protein 25g, calories 200, carbs 15
- חזה עוף 100g: protein 31g, calories 165, carbs 0
- קוטג' 250g: protein 28g, calories 210, carbs 8
- יוגורט יווני 200g: protein 20g, calories 160, carbs 8
- לחם פרוסה / bread slice: protein 3g, calories 80, carbs 15
- אורז 100g: protein 3g, calories 130, carbs 28
- סלמון 150g: protein 30g, calories 260, carbs 0
- גבינה צהובה פרוסה: protein 7g, calories 80, carbs 0

Return ONLY JSON, no explanation.`,
    messages: [{ role: 'user', content: `Date: ${date}\nMessage: ${text}` }],
  })

  const content = msg.content[0]
  if (content.type !== 'text') return {}
  try {
    return JSON.parse(content.text.trim())
  } catch {
    return {}
  }
}

async function sendSlackReply(channel: string, text: string) {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) return
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ channel, text }),
  })
}

export async function POST(req: Request) {
  const rawBody = await req.text()
  const timestamp = req.headers.get('x-slack-request-timestamp') ?? ''
  const signature = req.headers.get('x-slack-signature') ?? ''

  // Allow missing secrets in dev
  if (process.env.SLACK_SIGNING_SECRET && !verifySlackSignature(rawBody, timestamp, signature)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const payload = JSON.parse(rawBody)

  // Slack URL verification challenge
  if (payload.type === 'url_verification') {
    return Response.json({ challenge: payload.challenge })
  }

  if (payload.type !== 'event_callback') {
    return new Response('OK')
  }

  const event = payload.event
  // Only handle regular messages, not bot messages
  if (event.type !== 'message' || event.bot_id || event.subtype) {
    return new Response('OK')
  }

  const text: string = event.text ?? ''
  const channel: string = event.channel
  const today = new Date().toISOString().split('T')[0]

  const parsed = await parseMessage(text, today)
  if (Object.keys(parsed).length === 0) {
    await sendSlackReply(channel, '🤔 לא הצלחתי לפרש את ההודעה. נסה שוב עם תיאור של מה אכלת או האימון שעשית.')
    return new Response('OK')
  }

  // Get today's existing log
  const { data: existing } = await supabase
    .from('fitness_daily_logs')
    .select('*')
    .eq('date', today)
    .maybeSingle()

  const updated: Record<string, unknown> = {
    date: today,
    protein_g: (existing?.protein_g ?? 0) + (parsed.protein_g ?? 0),
    calories_kcal: (existing?.calories_kcal ?? 0) + (parsed.calories_kcal ?? 0),
    carbs_g: (existing?.carbs_g ?? 0) + (parsed.carbs_g ?? 0),
  }

  if (parsed.workout_done !== undefined) updated.workout_done = parsed.workout_done
  if (parsed.workout_type) updated.workout_type = parsed.workout_type
  if (parsed.weight_kg) updated.weight_kg = parsed.weight_kg
  if (parsed.notes) {
    updated.notes = existing?.notes ? `${existing.notes}\n${parsed.notes}` : parsed.notes
  }

  await supabase.from('fitness_daily_logs').upsert(updated, { onConflict: 'date' })

  const proteinTarget = 140
  const calTarget = 2100
  const proteinPct = Math.round(((updated.protein_g as number) / proteinTarget) * 100)
  const calPct = Math.round(((updated.calories_kcal as number) / calTarget) * 100)

  const lines: string[] = ['✅ *עודכן!*']
  if (parsed.protein_g) lines.push(`חלבון נוסף: +${parsed.protein_g}g`)
  if (parsed.calories_kcal) lines.push(`קלוריות: +${parsed.calories_kcal}`)
  if (parsed.weight_kg) lines.push(`משקל: ${parsed.weight_kg} ק"ג`)
  if (parsed.workout_done) lines.push(`אימון: ✅`)
  lines.push(`\n*סה"כ היום:*`)
  lines.push(`💪 חלבון: ${updated.protein_g}g / ${proteinTarget}g (${proteinPct}%)`)
  lines.push(`🔥 קלוריות: ${updated.calories_kcal} / ${calTarget} (${calPct}%)`)

  await sendSlackReply(channel, lines.join('\n'))

  return new Response('OK')
}
