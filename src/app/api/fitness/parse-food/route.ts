import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const NUTRITION_REF = `Nutrition reference (be generous — restaurant/real portions are larger than typical estimates):
ביצה: 6g protein, 78kcal, 0g carbs | חצי אבוקדו: 2g, 120kcal, 6g | שליש אבוקדו: 1g, 80kcal, 4g
קוטג' 250g: 28g, 210kcal, 6g | יוגורט חלבון 200g: 20g, 150kcal, 8g | גבינה בולגרית 30g: 5g, 75kcal, 1g
חזה עוף 200g: 62g, 330kcal, 0g | חזה עוף 100g: 31g, 165kcal, 0g | סלמון 150g: 30g, 260kcal, 0g
דג לבן 150g: 30g, 150kcal, 0g | טונה פחית: 30g, 140kcal, 0g | בשר אדום 150g: 34g, 300kcal, 0g
שייק חלבון: 25g, 200kcal, 5g | אורז 150g: 3g, 195kcal, 44g | בטטה 150g: 3g, 130kcal, 30g
לחם פרוסה: 3g, 80kcal, 15g | דייסה: 10g, 300kcal, 55g | פירות מנה: 1g, 80kcal, 20g
סלט ירקות: 2g, 50kcal, 8g | ירקות קלויים: 3g, 80kcal, 15g | טופו 150g: 12g, 120kcal, 3g
כף טחינה גולמית (15g): 3g, 90kcal, 3g | כף שמן זית: 0g, 120kcal, 0g | קפה שחור: 0g, 5kcal, 0g
כפית סוכר: 0g, 16kcal, 4g | קרואסון: 8g, 350kcal, 40g | פיצה פרוסה: 12g, 285kcal, 35g
המבורגר: 25g, 500kcal, 35g | שוקולד 25g: 2g, 130kcal, 15g | חומוס מנה: 8g, 200kcal, 20g
If tahini appears as sauce or side, count at least 2 tablespoons (6g protein, 180kcal).`

const SYSTEM = `You are a nutrition assistant for a Hebrew-speaking fitness tracker.
Analyze the food described or shown and return JSON.

${NUTRITION_REF}

Return ONLY one of these two JSON formats:

Format 1 — if you have enough info to estimate:
{"protein_g": number, "calories_kcal": number, "carbs_g": number, "description": "Hebrew description", "notes": "optional: any key assumptions made"}

Format 2 — if you need clarification:
{"question": "concise Hebrew question to clarify portion or ingredient"}

Rules:
- Overestimate rather than underestimate
- If portion size is unclear from a photo, ask
- Keep description in Hebrew, concise (max 40 chars)
- Return ONLY valid JSON, no markdown, no extra text`

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { text, image_base64, image_media_type, clarification_context } = body

  if (!text && !image_base64) {
    return NextResponse.json({ error: 'no input' }, { status: 400 })
  }

  // Build message content
  const userContent: Anthropic.MessageParam['content'] = []

  if (image_base64) {
    userContent.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: image_media_type ?? 'image/jpeg',
        data: image_base64,
      },
    })
  }

  const textPart = [
    clarification_context ? `Context: ${clarification_context}` : null,
    text ? text : image_base64 ? 'What is in this meal? Estimate nutrition.' : null,
  ].filter(Boolean).join('\n')

  if (textPart) {
    userContent.push({ type: 'text', text: textPart })
  }

  const msg = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 512,
    system: SYSTEM,
    messages: [{ role: 'user', content: userContent }],
  })

  const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''

  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  try {
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw)
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'parse failed', raw }, { status: 500 })
  }
}
