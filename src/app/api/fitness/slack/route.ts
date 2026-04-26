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

const NUTRITION_REF = `Nutrition reference (be generous — overestimate rather than underestimate):
ביצה: 6g protein, 78kcal | חצי אבוקדו: 2g, 120kcal | שלישית אבוקדו: 1g, 80kcal
שייק חלבון: 25g, 200kcal | חזה עוף 200g: 62g, 330kcal | קוטג' 250g: 28g, 210kcal
יוגורט חלבון 200g: 20g, 150kcal | לחם פרוסה: 3g, 80kcal | אורז 150g: 3g, 195kcal
סלמון 150g: 30g, 260kcal | קפה שחור: 0g, 5kcal | כפית סוכר: 0g, 16kcal
כף טחינה גולמית (15g): 3g, 90kcal | 2 כפות טחינה: 6g, 180kcal
בטטה 150g: 3g, 130kcal | בשר אדום 150g: 34g, 300kcal | טונה פחית: 30g, 140kcal
גבינה בולגרית 30g: 5g, 75kcal | ביצה קשה: 6g, 78kcal | קרואסון: 8g, 350kcal
If tahini appears as sauce/side, count at least 2 tablespoons (6g, 180kcal).
Restaurant portions are larger than home — estimate generously.`

type ParseResult = {
  intent: 'food_update' | 'status_query' | 'other'
  protein_g?: number
  calories_kcal?: number
  carbs_g?: number
  workout_done?: boolean
  workout_type?: string
  weight_kg?: number
  description?: string
}

function extractJson(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (match) return match[1].trim()
  const obj = text.match(/\{[\s\S]*\}/)
  if (obj) return obj[0]
  return text.trim()
}

async function downloadSlackImage(url: string): Promise<{ data: string; mediaType: string } | null> {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) return null
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const mediaType = contentType.split(';')[0].trim()
    const buffer = await res.arrayBuffer()
    const data = Buffer.from(buffer).toString('base64')
    return { data, mediaType }
  } catch {
    return null
  }
}

async function parseTextMessage(text: string, date: string): Promise<ParseResult> {
  const cleanText = text.replace(/<@[A-Z0-9]+>/g, '').trim()
  if (!cleanText) return { intent: 'other' }

  const msg = await getAnthropic().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: `You are a fitness tracker assistant. Classify the user's message:

1. "food_update" — reporting food eaten, workout done, or weight measured
2. "status_query" — asking about progress, protein, calories, goals
3. "other" — greetings, unrelated

For "food_update" extract:
- protein_g, calories_kcal, carbs_g (numbers)
- workout_done (boolean), workout_type ("gym_a"|"gym_b"|"swimming"|"calisthenics"|"rest")
- weight_kg (number if mentioned)
- description: short Hebrew description of the food

${NUTRITION_REF}

Return ONLY JSON: {"intent":"food_update","protein_g":14,"calories_kcal":295,"carbs_g":0,"description":"2 ביצים וחצי אבוקדו"}`,
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

async function parseImageMessage(
  imageData: string,
  mediaType: string,
  caption: string,
): Promise<ParseResult> {
  const userContent: Anthropic.MessageParam['content'] = [
    {
      type: 'image',
      source: { type: 'base64', media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: imageData },
    },
    {
      type: 'text',
      text: caption
        ? `Analyze this meal photo. Additional context: ${caption}`
        : 'Analyze this meal photo and estimate nutrition.',
    },
  ]

  const msg = await getAnthropic().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: `You are a nutrition analyzer. Look at the meal photo and estimate nutrition values.

${NUTRITION_REF}

Return ONLY JSON:
{"intent":"food_update","protein_g":30,"calories_kcal":450,"carbs_g":20,"description":"תיאור קצר בעברית של מה שנראה בתמונה"}

Be generous with estimates. If the photo is unclear, still provide your best estimate.`,
    messages: [{ role: 'user', content: userContent }],
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
  const proteinLeft = Math.max(0, dayInfo.proteinTarget - protein)
  const calLeft = Math.max(0, dayInfo.calTarget - calories)
  const bar = '█'.repeat(Math.round((protein / dayInfo.proteinTarget) * 10)) + '░'.repeat(10 - Math.round((protein / dayInfo.proteinTarget) * 10))

  return [
    `📊 *סטטוס היום — ${dayInfo.label}*`,
    ``,
    `💪 חלבון: *${protein}g* / ${dayInfo.proteinTarget}g  ${bar}`,
    proteinLeft > 0 ? `   ← עוד *${proteinLeft}g* לסיום` : `   ✅ יעד חלבון הושג!`,
    ``,
    `🔥 קלוריות: *${calories}* / ${dayInfo.calTarget}  (נשאר: ${calLeft})`,
    `🌾 פחמימות: *${carbs}g* / ${dayInfo.carbTarget}g`,
    log?.workout_done ? `🏃 אימון: ✅ בוצע` : `🏃 אימון: ❌ טרם בוצע`,
    ``,
    `🔗 https://orgad.fun/fitness`,
  ].join('\n')
}

async function applyFoodUpdate(parsed: ParseResult, today: string, channel: string, dayInfo: ReturnType<typeof getDayInfo>) {
  const { data: existing } = await supabase
    .from('fitness_daily_logs')
    .select('*')
    .eq('date', today)
    .maybeSingle()

  // Merge nutrition into existing log
  const newProtein = ((existing?.protein_g as number) ?? 0) + (parsed.protein_g ?? 0)
  const newCalories = ((existing?.calories_kcal as number) ?? 0) + (parsed.calories_kcal ?? 0)
  const newCarbs = ((existing?.carbs_g as number) ?? 0) + (parsed.carbs_g ?? 0)

  // Append entry to breakfast_type JSON array
  let entries: Array<{ id: string; description: string; protein: number; calories: number; carbs: number }> = []
  if (existing?.breakfast_type) {
    try {
      const p = JSON.parse(existing.breakfast_type as string)
      if (Array.isArray(p)) entries = p
    } catch {}
  }
  if (parsed.protein_g || parsed.calories_kcal) {
    entries.push({
      id: Math.random().toString(36).slice(2),
      description: parsed.description ?? 'מ-Slack',
      protein: parsed.protein_g ?? 0,
      calories: parsed.calories_kcal ?? 0,
      carbs: parsed.carbs_g ?? 0,
    })
  }

  const updated: Record<string, unknown> = {
    date: today,
    protein_g: newProtein,
    calories_kcal: newCalories,
    carbs_g: newCarbs,
    breakfast_type: JSON.stringify(entries),
  }
  if (parsed.workout_done !== undefined) updated.workout_done = parsed.workout_done
  if (parsed.workout_type) updated.workout_type = parsed.workout_type
  if (parsed.weight_kg) updated.weight_kg = parsed.weight_kg

  await supabase.from('fitness_daily_logs').upsert(updated, { onConflict: 'date' })

  const proteinLeft = Math.max(0, dayInfo.proteinTarget - newProtein)
  const lines: string[] = [`✅ *${parsed.description ?? 'עודכן!'}*`]
  if (parsed.protein_g) lines.push(`חלבון: +${parsed.protein_g}g`)
  if (parsed.calories_kcal) lines.push(`קלוריות: +${parsed.calories_kcal}`)
  if (parsed.carbs_g) lines.push(`פחמימות: +${parsed.carbs_g}g`)
  if (parsed.weight_kg) lines.push(`משקל: ${parsed.weight_kg} ק"ג`)
  if (parsed.workout_done) lines.push(`אימון: ✅`)
  lines.push(`\n*סה"כ היום:*`)
  lines.push(`💪 חלבון: ${newProtein}g / ${dayInfo.proteinTarget}g`)
  lines.push(`🔥 קלוריות: ${newCalories} / ${dayInfo.calTarget}`)
  if (proteinLeft > 0) lines.push(`⚡ עוד ${proteinLeft}g חלבון לסיום`)

  await sendSlackReply(channel, lines.join('\n'))
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
  if (payload.type === 'url_verification') return Response.json({ challenge: payload.challenge })
  if (payload.type !== 'event_callback') return new Response('OK')
  if (retryNum && retryNum !== '0') return new Response('OK')

  const event = payload.event
  if (event.type !== 'message' || event.bot_id || event.subtype) return new Response('OK')

  const text: string = event.text ?? ''
  const channel: string = event.channel
  const today = toISODate(new Date())
  const dayInfo = getDayInfo(new Date())

  // Check for image attachments
  const imageFiles: Array<{ url_private: string; mimetype: string }> =
    (event.files ?? []).filter((f: { mimetype: string }) => f.mimetype?.startsWith('image/'))

  if (imageFiles.length > 0) {
    // Photo message — download and analyze
    const file = imageFiles[0]
    const image = await downloadSlackImage(file.url_private)
    if (!image) {
      await sendSlackReply(channel, '❌ לא הצלחתי להוריד את התמונה. נסה שוב.')
      return new Response('OK')
    }
    const parsed = await parseImageMessage(image.data, image.mediaType, text)
    if (parsed.intent === 'food_update' && (parsed.protein_g || parsed.calories_kcal)) {
      await applyFoodUpdate(parsed, today, channel, dayInfo)
    } else {
      await sendSlackReply(channel, '🤔 לא הצלחתי לזהות מזון בתמונה. נסה לכתוב מה אכלת.')
    }
    return new Response('OK')
  }

  // Text-only message
  const parsed = await parseTextMessage(text, today)

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
    await applyFoodUpdate(parsed, today, channel, dayInfo)
    return new Response('OK')
  }

  return new Response('OK')
}
