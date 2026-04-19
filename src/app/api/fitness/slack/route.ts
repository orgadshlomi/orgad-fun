import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { createHmac } from 'crypto'
import { getDayInfo, toISODate } from '@/lib/fitness-logic'

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

type ParseResult = {
  intent: 'food_update' | 'status_query' | 'other'
  protein_g?: number
  calories_kcal?: number
  carbs_g?: number
  workout_done?: boolean
  workout_type?: string
  weight_kg?: number
  notes?: string
}

function extractJson(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (match) return match[1].trim()
  return text.trim()
}

async function parseMessage(text: string, date: string): Promise<ParseResult> {
  const cleanText = text.replace(/<@[A-Z0-9]+>/g, '').trim()

  const msg = await getAnthropic().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: `You are a fitness tracker assistant. Classify the user's message into one of three intents:

1. "food_update" — user is reporting food eaten, workout done, or weight measured
2. "status_query" — user is asking about their progress, protein status, calories, goals, etc.
3. "other" — greetings, unrelated questions

For "food_update", also extract:
- protein_g: total protein in grams
- calories_kcal: total calories
- carbs_g: total carbs
- workout_done: boolean (if workout mentioned)
- workout_type: "gym_a" | "gym_b" | "swimming" | "calisthenics" | "rest"
- weight_kg: number (if weight mentioned)
- notes: original text

Nutrition reference (be generous with calories — better to overestimate than underestimate):
ביצת עין: 6g protein, 90kcal | חצי אבוקדו: 2g, 120kcal | שלישית אבוקדו: 1g, 80kcal
שייק חלבון: 25g, 200kcal | חזה עוף 200g: 62g, 330kcal | קוטג' 250g: 28g, 210kcal
יוגורט חלבון 200g: 20g, 150kcal | לחם פרוסה: 3g, 80kcal | אורז 100g: 3g, 130kcal
סלמון 150g: 30g, 260kcal | קפה שחור: 0g, 5kcal | כפית סוכר: 0g, 16kcal
כף טחינה גולמית (15g): 3g protein, 90kcal | 2 כפות טחינה: 6g, 180kcal
כרובית 200g: 4g, 50kcal | בטטה 150g: 3g, 130kcal | תירס 100g: 3g, 86kcal
שמן זית כף: 0g, 120kcal | חמאה כף: 0g, 100kcal
בשר טחון 100g: 17g, 250kcal | סטייק 150g: 34g, 300kcal
גבינה צהובה פרוסה (20g): 5g, 75kcal | ביצה קשה: 6g, 78kcal

If a dish is described without exact portions, estimate generously (restaurant portions are typically larger than home portions).
If tahini / טחינה is mentioned as a side or sauce, add at least 2 tablespoons (170kcal) unless specified otherwise.

Return ONLY JSON, e.g.: {"intent":"food_update","protein_g":14,"calories_kcal":295,"notes":"2 ביצי עין וחצי אבוקדו"}`,
    messages: [{ role: 'user', content: `Date: ${date}\n${cleanText}` }],
  })

  const content = msg.content[0]
  if (content.type !== 'text') return { intent: 'other' }
  try {
    return JSON.parse(extractJson(content.text))
  } catch {
    return { intent: 'other' }
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

function buildStatusReply(log: Record<string, unknown> | null, dayInfo: ReturnType<typeof getDayInfo>): string {
  const protein = (log?.protein_g as number) ?? 0
  const calories = (log?.calories_kcal as number) ?? 0
  const carbs = (log?.carbs_g as number) ?? 0
  const proteinTarget = dayInfo.proteinTarget
  const calTarget = dayInfo.calTarget
  const carbTarget = dayInfo.carbTarget
  const proteinLeft = Math.max(0, proteinTarget - protein)
  const calLeft = Math.max(0, calTarget - calories)

  const proteinBar = Math.round((protein / proteinTarget) * 10)
  const bar = '█'.repeat(proteinBar) + '░'.repeat(10 - proteinBar)

  return [
    `📊 *סטטוס היום — ${dayInfo.label}*`,
    ``,
    `💪 חלבון: *${protein}g* / ${proteinTarget}g  ${bar}`,
    proteinLeft > 0 ? `   ← עוד *${proteinLeft}g* לסיום` : `   ✅ יעד חלבון הושג!`,
    ``,
    `🔥 קלוריות: *${calories}* / ${calTarget}  (נשאר: ${calLeft})`,
    `🌾 פחמימות: *${carbs}g* / ${carbTarget}g`,
    log?.workout_done ? `🏃 אימון: ✅ בוצע` : `🏃 אימון: ❌ טרם בוצע`,
    ``,
    `🔗 https://orgad.fun/fitness`,
  ].join('\n')
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

  if (payload.type !== 'event_callback') return new Response('OK')

  // Ignore Slack retries to prevent duplicate responses
  if (retryNum && retryNum !== '0') return new Response('OK')

  const event = payload.event
  if (event.type !== 'message' || event.bot_id || event.subtype) return new Response('OK')

  const text: string = event.text ?? ''
  const channel: string = event.channel
  const today = toISODate(new Date())
  const dayInfo = getDayInfo(new Date())

  const parsed = await parseMessage(text, today)

  if (parsed.intent === 'status_query') {
    const { data: log } = await supabase
      .from('fitness_daily_logs')
      .select('*')
      .eq('date', today)
      .maybeSingle()
    await sendSlackReply(channel, buildStatusReply(log as Record<string, unknown> | null, dayInfo))
    return new Response('OK')
  }

  if (parsed.intent === 'food_update') {
    const { data: existing } = await supabase
      .from('fitness_daily_logs')
      .select('*')
      .eq('date', today)
      .maybeSingle()

    const updated: Record<string, unknown> = {
      date: today,
      protein_g: ((existing?.protein_g as number) ?? 0) + (parsed.protein_g ?? 0),
      calories_kcal: ((existing?.calories_kcal as number) ?? 0) + (parsed.calories_kcal ?? 0),
      carbs_g: ((existing?.carbs_g as number) ?? 0) + (parsed.carbs_g ?? 0),
    }

    if (parsed.workout_done !== undefined) updated.workout_done = parsed.workout_done
    if (parsed.workout_type) updated.workout_type = parsed.workout_type
    if (parsed.weight_kg) updated.weight_kg = parsed.weight_kg
    if (parsed.notes) {
      updated.notes = existing?.notes ? `${existing.notes}\n${parsed.notes}` : parsed.notes
    }

    await supabase.from('fitness_daily_logs').upsert(updated, { onConflict: 'date' })

    const proteinTarget = dayInfo.proteinTarget
    const calTarget = dayInfo.calTarget
    const proteinLeft = Math.max(0, proteinTarget - (updated.protein_g as number))

    const lines: string[] = ['✅ *עודכן!*']
    if (parsed.protein_g) lines.push(`חלבון נוסף: +${parsed.protein_g}g`)
    if (parsed.calories_kcal) lines.push(`קלוריות: +${parsed.calories_kcal}`)
    if (parsed.weight_kg) lines.push(`משקל: ${parsed.weight_kg} ק"ג`)
    if (parsed.workout_done) lines.push(`אימון: ✅`)
    lines.push(`\n*סה"כ היום:*`)
    lines.push(`💪 חלבון: ${updated.protein_g}g / ${proteinTarget}g`)
    lines.push(`🔥 קלוריות: ${updated.calories_kcal} / ${calTarget}`)
    if (proteinLeft > 0) lines.push(`⚡ עוד ${proteinLeft}g חלבון לסיום`)

    await sendSlackReply(channel, lines.join('\n'))
    return new Response('OK')
  }

  // intent === 'other' — don't respond to avoid noise
  return new Response('OK')
}
