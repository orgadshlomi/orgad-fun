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

export type FoodItem = {
  id: string
  name: string
  defaultQty: number  // used when first checked
  protein: number     // per unit
  calories: number    // per unit
  carbs: number       // per unit
}

// Single unified food list — same items available for every meal
export const FOOD_ITEMS: FoodItem[] = [
  // Eggs & dairy
  { id: 'egg',              name: 'ביצה',                defaultQty: 2, protein: 6,  calories: 78,  carbs: 0  },
  { id: 'avocado_half',     name: 'חצי אבוקדו',          defaultQty: 1, protein: 2,  calories: 120, carbs: 6  },
  { id: 'cottage',          name: "קוטג' 250g",          defaultQty: 1, protein: 28, calories: 210, carbs: 6  },
  { id: 'greek_yogurt',     name: 'יוגורט חלבון 200g',   defaultQty: 1, protein: 20, calories: 150, carbs: 8  },
  { id: 'bulgarian_cheese', name: 'גבינה בולגרית 30g',   defaultQty: 1, protein: 5,  calories: 75,  carbs: 1  },
  // Proteins
  { id: 'chicken',          name: 'חזה עוף 200g',        defaultQty: 1, protein: 62, calories: 330, carbs: 0  },
  { id: 'salmon',           name: 'סלמון 150g',          defaultQty: 1, protein: 30, calories: 260, carbs: 0  },
  { id: 'white_fish',       name: 'דג לבן 150g',         defaultQty: 1, protein: 30, calories: 150, carbs: 0  },
  { id: 'tuna',             name: 'טונה (פחית)',          defaultQty: 1, protein: 30, calories: 140, carbs: 0  },
  { id: 'beef',             name: 'בשר אדום 150g',       defaultQty: 1, protein: 34, calories: 300, carbs: 0  },
  { id: 'tofu',             name: 'טופו 150g',           defaultQty: 1, protein: 12, calories: 120, carbs: 3  },
  { id: 'protein_shake',    name: 'שייק חלבון',          defaultQty: 1, protein: 25, calories: 200, carbs: 5  },
  // Carbs
  { id: 'rice',             name: 'אורז 150g',           defaultQty: 1, protein: 3,  calories: 195, carbs: 44 },
  { id: 'sweet_potato',     name: 'בטטה 150g',           defaultQty: 1, protein: 3,  calories: 130, carbs: 30 },
  { id: 'bread_slice',      name: 'פרוסת לחם מלא',       defaultQty: 1, protein: 3,  calories: 80,  carbs: 15 },
  { id: 'oatmeal',          name: 'דייסת שיבולת שועל',   defaultQty: 1, protein: 10, calories: 300, carbs: 55 },
  { id: 'fruits',           name: 'פירות (מנה)',          defaultQty: 1, protein: 1,  calories: 80,  carbs: 20 },
  // Vegetables
  { id: 'salad',            name: 'סלט ירקות',           defaultQty: 1, protein: 2,  calories: 50,  carbs: 8  },
  { id: 'roasted_veg',      name: 'ירקות קלויים',        defaultQty: 1, protein: 3,  calories: 80,  carbs: 15 },
  { id: 'stir_veg',         name: 'ירקות מוקפצים',      defaultQty: 1, protein: 3,  calories: 60,  carbs: 10 },
  // Fats & extras
  { id: 'tahini_tbsp',      name: 'כף טחינה גולמית',     defaultQty: 1, protein: 3,  calories: 90,  carbs: 3  },
  { id: 'olive_oil',        name: 'כף שמן זית',          defaultQty: 1, protein: 0,  calories: 120, carbs: 0  },
  { id: 'coffee',           name: 'קפה שחור',            defaultQty: 1, protein: 0,  calories: 5,   carbs: 0  },
  { id: 'sugar_tsp',        name: 'כפית סוכר',           defaultQty: 1, protein: 0,  calories: 16,  carbs: 4  },
]

export const DEFAULT_BREAKFAST_ITEMS: Record<string, number> = {
  egg: 2,
  avocado_half: 1,
  coffee: 1,
}

export function calcFoodNutrition(items: Record<string, number>) {
  let protein = 0, calories = 0, carbs = 0
  for (const item of FOOD_ITEMS) {
    const qty = items[item.id] ?? 0
    protein += item.protein * qty
    calories += item.calories * qty
    carbs += item.carbs * qty
  }
  return { protein, calories, carbs }
}

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
  breakfastItems: Record<string, number> | null,
  lunchItems: Record<string, number> | null,
  dinnerItems: Record<string, number> | null,
) {
  const calc = (items: Record<string, number> | null) =>
    items ? calcFoodNutrition(items) : { protein: 0, calories: 0, carbs: 0 }
  const b = calc(breakfastItems)
  const l = calc(lunchItems)
  const d = calc(dinnerItems)
  return {
    protein: b.protein + l.protein + d.protein,
    calories: b.calories + l.calories + d.calories,
    carbs: b.carbs + l.carbs + d.carbs,
  }
}
