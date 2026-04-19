import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { createHmac } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

function verifySlackSignature(body: string, timestamp: string, signature: string): boolean {
  const secret = process.env.SLACK_SIGNING_SECRET
  if (!secret) return false
  const baseString = `v0:${timestamp}:${body}`
  const hmac = createHmac('sha256', secret).update(baseString).digest('hex')
  return `v0=${hmac}` === signature
}

type ParsedMeal = {
  protein_g?: number
  calories_kcal?: number
  carbs_g?: number
  workout_done?: boolean
  workout_type?: string
  weight_kg?: number
  notes?: string
  is_food_message?: boolean
}

function extractJson(text: string): string {
  // Strip markdown code fences if present
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (match) return match[1].trim()
  return text.trim()
}

async function parseMessage(text: string, date: string): Promise<ParsedMeal> {
  // Strip Slack mention tags like <@U123ABC>
  const cleanText = text.replace(/<@[A-Z0-9]+>/g, '').trim()

  const msg = await getAnthropic().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: `You are a fitness tracker. Parse Hebrew or English messages about food eaten, workouts done, or weight.

If the message is NOT about food/workout/weight (e.g. a question or greeting), return: {"is_food_message": false}

Otherwise extract and return JSON with these fields (only include what's mentioned):
- is_food_message: true
- protein_g: number (total protein in grams)
- calories_kcal: number (total calories)
- carbs_g: number (total carbs in grams)
- workout_done: boolean
- workout_type: "gym_a" | "gym_b" | "swimming" | "calisthenics" | "rest"
- weight_kg: number
- notes: string (original description)

Reference values per item:
ביצת עין: 6g protein, 90kcal | חצי אבוקדו: 2g, 120kcal | שייק חלבון: 25g, 200kcal
חזה עוף 100g: 31g, 165kcal | קוטג' 250g: 28g, 210kcal | יוגורט יווני 200g: 20g, 160kcal
פרוסת לחם: 3g, 80kcal | אורז 100g: 3g, 130kcal | סלמון 150g: 30g, 260kcal
כפית סוכר בקפה: 0g protein, 16kcal | קפה שחור: 0g, 5kcal

Return ONLY the JSON object, nothing else.`,
    messages: [{ role: 'user', content: `Date: ${date}\n${cleanText}` }],
  })

  const content = msg.content[0]
  if (content.type !== 'text') return {}
  try {
    return JSON.parse(extractJson(content.text))
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
  const retryNum = req.headers.get('x-slack-retry-num')

  if (process.env.SLACK_SIGNING_SECRET && !verifySlackSignature(rawBody, timestamp, signature)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const payload = JSON.parse(rawBody)

  if (payload.type === 'url_verification') {
    return Response.json({ challenge: payload.challenge })
  }

  if (payload.type !== 'event_callback') {
    return new Response('OK')
  }

  // Ignore Slack retries — they mean we're processing too slowly
  if (retryNum && retryNum !== '0') {
    return new Response('OK')
  }

  const event = payload.event
  if (event.type !== 'message' || event.bot_id || event.subtype) {
    return new Response('OK')
  }

  const text: string = event.text ?? ''
  const channel: string = event.channel
  const today = new Date().toISOString().split('T')[0]

  const parsed = await parseMessage(text, today)

  if (!parsed.is_food_message || Object.keys(parsed).length <= 1) {
    await sendSlackReply(channel,
      '💬 כדי לעדכן את הטראקר, שלח תיאור של מה אכלת.\nלמשל: _"אכלתי 2 ביצי עין, חצי אבוקדו וקפה שחור"_'
    )
    return new Response('OK')
  }

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
