import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { toISODate } from '@/lib/fitness-logic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export async function GET() {
  const today = toISODate(new Date())
  const { data, error } = await supabase
    .from('fitness_daily_logs')
    .select('*')
    .eq('date', today)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ log: data })
}
