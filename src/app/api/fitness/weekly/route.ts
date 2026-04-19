import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export async function GET() {
  const [{ data: measurements }, { data: logs }] = await Promise.all([
    supabase.from('fitness_weekly_measurements').select('*').order('week_number'),
    supabase
      .from('fitness_daily_logs')
      .select('date, protein_g, calories_kcal, workout_done, weight_kg')
      .order('date', { ascending: false })
      .limit(42),
  ])

  return NextResponse.json({ measurements: measurements ?? [], logs: logs ?? [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const { data, error } = await supabase
    .from('fitness_weekly_measurements')
    .upsert(body, { onConflict: 'week_number' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ measurement: data })
}
