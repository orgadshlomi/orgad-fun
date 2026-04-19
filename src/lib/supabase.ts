import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export type DailyLog = {
  id?: string
  date: string
  weight_kg?: number | null
  breakfast_type?: string | null
  lunch_option?: string | null
  dinner_option?: string | null
  snacks?: string | null
  protein_g: number
  calories_kcal: number
  carbs_g: number
  workout_done: boolean
  workout_type?: string | null
  day_type?: string | null
  notes?: string | null
}

export type WeeklyMeasurement = {
  id?: string
  week_number: number
  date: string
  weight_kg?: number | null
  waist_cm?: number | null
  body_fat_pct?: number | null
  workouts_completed?: number
  nutrition_score?: number | null
  notes?: string | null
}
