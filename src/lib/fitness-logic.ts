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

// Targets per plan: Strength 1950/200g | Swim 1900/150g | Walking 1850/110g | Rest 1800/90g
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
    calTarget: 1900,
    proteinTarget: 140,
    label: 'Medium Carb — שחייה',
    emoji: '🏊',
    colorClass: 'text-blue-700',
    bgClass: 'bg-blue-50 border-blue-200',
  },
  2: {
    dayType: 'very_low_carb',
    workout: 'מנוחה + הליכה',
    workoutType: 'rest',
    carbTarget: 90,
    calTarget: 1800,
    proteinTarget: 140,
    label: 'Low Carb — מנוחה',
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
    calTarget: 1900,
    proteinTarget: 140,
    label: 'Medium Carb — שחייה',
    emoji: '🏊',
    colorClass: 'text-blue-700',
    bgClass: 'bg-blue-50 border-blue-200',
  },
  5: {
    dayType: 'very_low_carb',
    workout: 'הליכה / קליסטניקס',
    workoutType: 'calisthenics',
    carbTarget: 110,
    calTarget: 1850,
    proteinTarget: 140,
    label: 'Low-Medium Carb — הליכה',
    emoji: '🚶',
    colorClass: 'text-amber-700',
    bgClass: 'bg-amber-50 border-amber-200',
  },
  6: {
    dayType: 'very_low_carb',
    workout: 'מנוחה מוחלטת',
    workoutType: 'rest',
    carbTarget: 90,
    calTarget: 1800,
    proteinTarget: 140,
    label: 'Low Carb — מנוחה',
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

export type BreakfastItem = {
  id: string
  name: string
  defaultQty: number
  protein: number   // per unit
  calories: number  // per unit
  carbs: number     // per unit
}

export const BREAKFAST_ITEMS: BreakfastItem[] = [
  { id: 'egg',             name: 'ביצה',                    defaultQty: 2, protein: 6,  calories: 78,  carbs: 0  },
  { id: 'avocado_half',    name: 'חצי אבוקדו',              defaultQty: 1, protein: 2,  calories: 120, carbs: 6  },
  { id: 'coffee',          name: 'קפה שחור',                defaultQty: 1, protein: 0,  calories: 5,   carbs: 0  },
  { id: 'protein_shake',   name: 'שייק חלבון',              defaultQty: 1, protein: 25, calories: 200, carbs: 5  },
  { id: 'greek_yogurt',    name: 'יוגורט יווני 200g',       defaultQty: 1, protein: 20, calories: 160, carbs: 8  },
  { id: 'bulgarian_cheese',name: 'גבינה בולגרית 30g',       defaultQty: 1, protein: 5,  calories: 75,  carbs: 1  },
  { id: 'cottage',         name: "קוטג' 250g",              defaultQty: 1, protein: 28, calories: 210, carbs: 6  },
  { id: 'oatmeal',         name: 'דייסת שיבולת שועל',       defaultQty: 1, protein: 10, calories: 300, carbs: 55 },
  { id: 'fruits',          name: 'פירות (מנה)',              defaultQty: 1, protein: 1,  calories: 80,  carbs: 20 },
  { id: 'chia_milk',       name: "זרעי צ'יה + חלב צמחי",   defaultQty: 1, protein: 5,  calories: 180, carbs: 20 },
  { id: 'bread_slice',     name: 'פרוסת לחם מלא',           defaultQty: 1, protein: 3,  calories: 80,  carbs: 15 },
  { id: 'tahini_tbsp',     name: 'כף טחינה',                defaultQty: 1, protein: 3,  calories: 85,  carbs: 2  },
]

export const DEFAULT_BREAKFAST_ITEMS: Record<string, number> = {
  egg: 2,
  avocado_half: 1,
  coffee: 1,
}

export function calcBreakfastNutrition(items: Record<string, number>) {
  let protein = 0, calories = 0, carbs = 0
  for (const item of BREAKFAST_ITEMS) {
    const qty = items[item.id] ?? 0
    protein += item.protein * qty
    calories += item.calories * qty
    carbs += item.carbs * qty
  }
  return { protein, calories, carbs }
}

// All values from the official plan document (section 3)
export const LUNCH_OPTIONS = [
  // Chicken
  { id: 'chicken_carbs', name: 'חזה עוף גריל + אורז + סלט', protein: 45, calories: 520, carbs: 55 },
  { id: 'chicken_no', name: 'חזה עוף גריל + סלט גדול + זיתים', protein: 48, calories: 380, carbs: 8 },
  { id: 'chicken_oven_carbs', name: 'עוף בתנור + בטטה + ירקות קלויים', protein: 43, calories: 500, carbs: 45 },
  { id: 'chicken_oven_no', name: 'עוף בתנור + ירקות + טחינה', protein: 46, calories: 390, carbs: 10 },
  { id: 'chicken_stuffed_carbs', name: 'עוף ממולא גבינה ותרד + בטטה', protein: 48, calories: 530, carbs: 40 },
  { id: 'chicken_stuffed_no', name: 'עוף ממולא גבינה + תרד + סלט', protein: 47, calories: 400, carbs: 6 },
  // Fish
  { id: 'salmon_carbs', name: 'סלמון + קינואה + ירקות קלויים', protein: 44, calories: 560, carbs: 45 },
  { id: 'salmon_no', name: 'סלמון + סלט + לימון', protein: 46, calories: 420, carbs: 5 },
  { id: 'white_fish_carbs', name: 'דג לבן + בטטה + ירקות ים-תיכוניים', protein: 42, calories: 490, carbs: 42 },
  { id: 'white_fish_no', name: 'דג לבן + ירקות + לימון', protein: 44, calories: 360, carbs: 8 },
  { id: 'tuna_carbs', name: 'טונה + אורז מלא + סלט + זיתים', protein: 42, calories: 480, carbs: 50 },
  { id: 'tuna_no', name: 'טונה + ביצה קשה + סלט + זיתים', protein: 44, calories: 360, carbs: 6 },
  // Meat
  { id: 'beef_carbs', name: 'סטייק + בטטה אפויה + סלט יווני', protein: 46, calories: 580, carbs: 42 },
  { id: 'beef_no', name: 'סטייק + סלט גדול + שמן זית', protein: 46, calories: 420, carbs: 6 },
  { id: 'beef_ground_carbs', name: 'בקר טחון + פסטה מלאה + רוטב עגבניות', protein: 42, calories: 540, carbs: 55 },
  { id: 'beef_ground_no', name: 'בקר טחון + קישואים מוקפצים + שום', protein: 44, calories: 400, carbs: 8 },
  // Other
  { id: 'eggs_no', name: 'ביצים + ירקות', protein: 32, calories: 350, carbs: 8 },
]

// Dinner values from the official plan (section 5)
export const DINNER_OPTIONS = [
  { id: 'fish', name: 'דג לבן + ירקות אפויים + עדשים', protein: 38, calories: 380, carbs: 20 },
  { id: 'tofu', name: 'טופו + ברוקולי + 2 ביצים', protein: 38, calories: 420, carbs: 12 },
  { id: 'chicken', name: 'עוף + ירקות מוקפצים', protein: 44, calories: 350, carbs: 8 },
  { id: 'salmon', name: 'סלמון + ירקות קלויים', protein: 38, calories: 380, carbs: 6 },
  { id: 'cauliflower', name: 'פיצה כרובית + מוצרלה + עוף', protein: 36, calories: 360, carbs: 18 },
  { id: 'custom', name: 'אחר...', protein: 0, calories: 0, carbs: 0 },
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

// Items that can be added any time of day — post-workout shake, snack boosts, etc.
export const SUPPLEMENT_ITEMS = [
  { id: 'protein_shake', name: 'שייק חלבון',       protein: 25, calories: 200, carbs: 5  },
  { id: 'hard_egg',      name: 'ביצה קשה',          protein: 6,  calories: 78,  carbs: 0  },
  { id: 'cottage',       name: "קוטג' 250g",        protein: 28, calories: 210, carbs: 6  },
  { id: 'greek_yogurt',  name: 'יוגורט יווני 200g', protein: 20, calories: 160, carbs: 8  },
  { id: 'tuna_can',      name: 'שימורי טונה 160g',  protein: 32, calories: 160, carbs: 0  },
]

export function calcSupplementNutrition(items: Record<string, number>) {
  let protein = 0, calories = 0, carbs = 0
  for (const item of SUPPLEMENT_ITEMS) {
    const qty = items[item.id] ?? 0
    protein += item.protein * qty
    calories += item.calories * qty
    carbs += item.carbs * qty
  }
  return { protein, calories, carbs }
}

export function calcNutrition(
  breakfastItems: Record<string, number> | null,
  lunchId: string | null,
  dinnerId: string | null,
  supplementItems?: Record<string, number> | null,
) {
  const b = breakfastItems ? calcBreakfastNutrition(breakfastItems) : { protein: 0, calories: 0, carbs: 0 }
  let protein = b.protein
  let calories = b.calories
  let carbs = b.carbs

  if (lunchId && lunchId !== 'custom') {
    const l = LUNCH_OPTIONS.find(o => o.id === lunchId)
    if (l) { protein += l.protein; calories += l.calories; carbs += l.carbs }
  }
  if (dinnerId && dinnerId !== 'custom') {
    const d = DINNER_OPTIONS.find(o => o.id === dinnerId)
    if (d) { protein += d.protein; calories += d.calories; carbs += d.carbs }
  }
  if (supplementItems) {
    const s = calcSupplementNutrition(supplementItems)
    protein += s.protein; calories += s.calories; carbs += s.carbs
  }

  return { protein, calories, carbs }
}
