export const PLAN_START_DATE = '2026-04-19'
export const PLAN_START_WEIGHT = 78
export const PLAN_TARGET_WEIGHT = 74
export const PLAN_WEEKS = 6

export type DayType = 'high_carb' | 'medium_carb' | 'very_low_carb'

export type DayInfo = {
  dayType: DayType
  workout: string
  workoutType: string
  carbTarget: number
  calTarget: number
  proteinTarget: number
  label: string
  emoji: string
  colorClass: string
  bgClass: string
}

const DAY_SCHEDULE: Record<number, DayInfo> = {
  0: {
    dayType: 'high_carb',
    workout: "ג'ים B (חזה + כתפיים + טריצפס)",
    workoutType: 'gym_b',
    carbTarget: 200,
    calTarget: 1950,
    proteinTarget: 140,
    label: "High Carb — ג'ים אופציונלי",
    emoji: '💪',
    colorClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50 border-emerald-200',
  },
  1: {
    dayType: 'medium_carb',
    workout: 'שחייה',
    workoutType: 'swimming',
    carbTarget: 150,
    calTarget: 2100,
    proteinTarget: 140,
    label: 'Medium Carb — שחייה',
    emoji: '🏊',
    colorClass: 'text-blue-700',
    bgClass: 'bg-blue-50 border-blue-200',
  },
  2: {
    dayType: 'very_low_carb',
    workout: 'מנוחה',
    workoutType: 'rest',
    carbTarget: 50,
    calTarget: 1800,
    proteinTarget: 140,
    label: 'Very Low Carb — מנוחה',
    emoji: '😴',
    colorClass: 'text-amber-700',
    bgClass: 'bg-amber-50 border-amber-200',
  },
  3: {
    dayType: 'high_carb',
    workout: "ג'ים A (רגליים + גב)",
    workoutType: 'gym_a',
    carbTarget: 200,
    calTarget: 1950,
    proteinTarget: 140,
    label: "High Carb — ג'ים חובה",
    emoji: '🏋️',
    colorClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50 border-emerald-200',
  },
  4: {
    dayType: 'medium_carb',
    workout: 'שחייה',
    workoutType: 'swimming',
    carbTarget: 150,
    calTarget: 2100,
    proteinTarget: 140,
    label: 'Medium Carb — שחייה',
    emoji: '🏊',
    colorClass: 'text-blue-700',
    bgClass: 'bg-blue-50 border-blue-200',
  },
  5: {
    dayType: 'medium_carb',
    workout: 'כושר גופני (Calisthenics)',
    workoutType: 'calisthenics',
    carbTarget: 150,
    calTarget: 2100,
    proteinTarget: 140,
    label: 'Medium Carb — כושר גופני',
    emoji: '🤸',
    colorClass: 'text-blue-700',
    bgClass: 'bg-blue-50 border-blue-200',
  },
  6: {
    dayType: 'very_low_carb',
    workout: 'מנוחה',
    workoutType: 'rest',
    carbTarget: 50,
    calTarget: 1800,
    proteinTarget: 140,
    label: 'Very Low Carb — מנוחה',
    emoji: '😴',
    colorClass: 'text-amber-700',
    bgClass: 'bg-amber-50 border-amber-200',
  },
}

export function getDayInfo(date: Date = new Date()): DayInfo {
  return DAY_SCHEDULE[date.getDay()]
}

export function getCurrentWeek(date: Date = new Date()): number {
  const start = new Date(PLAN_START_DATE)
  const diffDays = Math.floor((date.getTime() - start.getTime()) / 86400000)
  return Math.min(Math.max(Math.floor(diffDays / 7) + 1, 1), 6)
}

export function getWeightProgress(current: number): number {
  const lost = PLAN_START_WEIGHT - current
  const totalTarget = PLAN_START_WEIGHT - PLAN_TARGET_WEIGHT
  return Math.min(Math.round((lost / totalTarget) * 100), 100)
}

export const PROTEIN_CHECKPOINTS = [
  { hour: 12, target: 35, label: 'עד 12:00', id: 'morning' },
  { hour: 15, target: 80, label: 'עד 15:00', id: 'afternoon' },
  { hour: 19, target: 100, label: 'עד 19:00', id: 'evening' },
  { hour: 23, target: 120, label: 'לפני שינה', id: 'night' },
]

export const BASE_BREAKFAST = { protein: 12, calories: 260, carbs: 5 }

export const BREAKFAST_OPTIONS = [
  { id: 'A', name: 'שייק חלבון', protein: 38, calories: 460, carbs: 25 },
  { id: 'B', name: 'יוגורט יווני + גבינה בולגרית', protein: 37, calories: 425, carbs: 17 },
  { id: 'C', name: "קוטג' + ירקות", protein: 39, calories: 485, carbs: 21 },
]

export const LUNCH_OPTIONS = [
  { id: 'chicken_carbs', name: 'חזה עוף + אורז', protein: 45, calories: 580, carbs: 65 },
  { id: 'chicken_no', name: 'חזה עוף + ירקות', protein: 45, calories: 320, carbs: 10 },
  { id: 'salmon_carbs', name: 'סלמון + אורז', protein: 42, calories: 620, carbs: 65 },
  { id: 'salmon_no', name: 'סלמון + ירקות', protein: 42, calories: 380, carbs: 8 },
  { id: 'beef_carbs', name: 'סטייק רזה + בטטה', protein: 48, calories: 650, carbs: 60 },
  { id: 'beef_no', name: 'סטייק רזה + סלט', protein: 48, calories: 370, carbs: 8 },
  { id: 'tuna_carbs', name: 'טונה + פסטה', protein: 40, calories: 560, carbs: 70 },
  { id: 'tuna_no', name: 'טונה + מלפפון', protein: 40, calories: 280, carbs: 5 },
  { id: 'eggs_no', name: 'ביצים + ירקות', protein: 32, calories: 350, carbs: 8 },
]

export const DINNER_OPTIONS = [
  { id: 'fish', name: 'פילה דג בתנור', protein: 38, calories: 320, carbs: 5 },
  { id: 'frittata', name: 'פריטטה ירקות', protein: 35, calories: 340, carbs: 8 },
  { id: 'tofu', name: 'טופו עם ירקות', protein: 35, calories: 310, carbs: 12 },
  { id: 'chicken', name: 'עוף צלוי', protein: 42, calories: 360, carbs: 5 },
  { id: 'salmon', name: 'סלמון אפוי', protein: 40, calories: 380, carbs: 3 },
  { id: 'cauliflower', name: 'פיצה כרובית', protein: 36, calories: 420, carbs: 25 },
]

export const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
export const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
]

export function formatHebrewDate(date: Date): string {
  return `יום ${HEBREW_DAYS[date.getDay()]}, ${date.getDate()} ב${HEBREW_MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function calcNutrition(
  breakfastId: string | null,
  lunchId: string | null,
  dinnerId: string | null,
) {
  let protein = BASE_BREAKFAST.protein
  let calories = BASE_BREAKFAST.calories
  let carbs = BASE_BREAKFAST.carbs

  if (breakfastId) {
    const b = BREAKFAST_OPTIONS.find(o => o.id === breakfastId)
    if (b) { protein += b.protein; calories += b.calories; carbs += b.carbs }
  }
  if (lunchId) {
    const l = LUNCH_OPTIONS.find(o => o.id === lunchId)
    if (l) { protein += l.protein; calories += l.calories; carbs += l.carbs }
  }
  if (dinnerId) {
    const d = DINNER_OPTIONS.find(o => o.id === dinnerId)
    if (d) { protein += d.protein; calories += d.calories; carbs += d.carbs }
  }

  return { protein, calories, carbs }
}
