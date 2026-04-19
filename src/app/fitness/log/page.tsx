'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getDayInfo,
  BREAKFAST_ITEMS,
  DEFAULT_BREAKFAST_ITEMS,
  LUNCH_OPTIONS,
  DINNER_OPTIONS,
  calcNutrition,
  toISODate,
} from '@/lib/fitness-logic'
import type { DailyLog } from '@/lib/supabase'

function Section({ title, subtitle, action, children }: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

export default function LogPage() {
  const router = useRouter()
  const dayInfo = getDayInfo()
  const hasCarbs = dayInfo.dayType === 'high_carb' || dayInfo.dayType === 'medium_carb'
  const lunchSuggestions = hasCarbs
    ? LUNCH_OPTIONS.filter(l => l.id.endsWith('_carbs'))
    : LUNCH_OPTIONS.filter(l => l.id.endsWith('_no'))

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [breakfastItems, setBreakfastItems] = useState<Record<string, number>>({ ...DEFAULT_BREAKFAST_ITEMS })
  const [form, setForm] = useState({
    date: toISODate(new Date()),
    weight_kg: '',
    lunch_option: lunchSuggestions[0]?.id ?? '',
    lunch_custom: '',
    dinner_option: '',
    dinner_custom: '',
    snacks: '',
    workout_done: false,
    workout_type: dayInfo.workoutType,
    notes: '',
  })

  useEffect(() => {
    fetch('/api/fitness/today')
      .then(r => r.json())
      .then(({ log }: { log: DailyLog | null }) => {
        if (!log) return
        if (log.breakfast_type) {
          try {
            const parsed = JSON.parse(log.breakfast_type)
            if (typeof parsed === 'object') setBreakfastItems(parsed)
          } catch {
            // legacy string id — ignore, keep defaults
          }
        }
        setForm(f => ({
          ...f,
          weight_kg: log.weight_kg?.toString() ?? '',
          lunch_option: log.lunch_option ?? lunchSuggestions[0]?.id ?? '',
          dinner_option: log.dinner_option ?? '',
          snacks: log.snacks ?? '',
          workout_done: log.workout_done,
          workout_type: log.workout_type ?? dayInfo.workoutType,
          // Strip auto-generated meal prefix lines so they don't accumulate across saves
          notes: (log.notes ?? '').split('\n').filter(l => !l.match(/^[🍳🍽️🌙]/u)).join('\n').trim(),
        }))
      })
  }, [])

  const { protein, calories, carbs } = calcNutrition(
    breakfastItems,
    form.lunch_option || null,
    form.dinner_option || null,
  )

  const proteinPct = Math.min(100, Math.round((protein / dayInfo.proteinTarget) * 100))
  const calPct = Math.min(100, Math.round((calories / dayInfo.calTarget) * 100))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const customNotes = [
      form.lunch_option === 'custom' && form.lunch_custom && `🍽️ צהריים: ${form.lunch_custom}`,
      form.dinner_option === 'custom' && form.dinner_custom && `🌙 ערב: ${form.dinner_custom}`,
      form.notes,
    ].filter(Boolean).join('\n')
    try {
      await fetch('/api/fitness/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          breakfast_type: JSON.stringify(breakfastItems),
          weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
          protein_g: protein,
          calories_kcal: calories,
          carbs_g: carbs,
          day_type: dayInfo.dayType,
          notes: customNotes,
        }),
      })
      setSaved(true)
      setTimeout(() => router.push('/fitness'), 1200)
    } finally {
      setSaving(false)
    }
  }

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📝 יומן יומי</h1>
        <p className="text-sm text-gray-500 mt-0.5">{dayInfo.emoji} {dayInfo.label}</p>
      </div>

      {/* Live nutrition preview — sticky */}
      <div className="sticky top-[57px] z-10 bg-gray-900 text-white rounded-2xl p-4 shadow-lg">
        <div className="flex justify-around text-center mb-3">
          <div>
            <p className="text-2xl font-bold tabular-nums text-emerald-400">{protein}<span className="text-sm text-gray-400">g</span></p>
            <p className="text-xs text-gray-400">חלבון</p>
            <p className="text-xs text-gray-500">מתוך {dayInfo.proteinTarget}g</p>
          </div>
          <div className="w-px bg-gray-700" />
          <div>
            <p className="text-2xl font-bold tabular-nums text-orange-300">{calories}</p>
            <p className="text-xs text-gray-400">קלוריות</p>
            <p className="text-xs text-gray-500">מתוך {dayInfo.calTarget}</p>
          </div>
          <div className="w-px bg-gray-700" />
          <div>
            <p className="text-2xl font-bold tabular-nums text-blue-300">{carbs}<span className="text-sm text-gray-400">g</span></p>
            <p className="text-xs text-gray-400">פחמימות</p>
            <p className="text-xs text-gray-500">מתוך {dayInfo.carbTarget}g</p>
          </div>
        </div>
        {/* Progress bars */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-700 rounded-full h-2">
              <div className="h-2 bg-emerald-400 rounded-full transition-all" style={{ width: `${proteinPct}%` }} />
            </div>
            <span className="text-xs text-gray-400 w-16 text-left">
              {proteinPct < 100 ? `נשאר ${dayInfo.proteinTarget - protein}g` : '✓ הושג'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-700 rounded-full h-2">
              <div className="h-2 bg-orange-400 rounded-full transition-all" style={{ width: `${calPct}%` }} />
            </div>
            <span className="text-xs text-gray-400 w-16 text-left">
              {calPct < 100 ? `נשאר ${dayInfo.calTarget - calories}` : '✓ הושג'}
            </span>
          </div>
        </div>
      </div>

      {/* Weight */}
      <Section title="⚖️ משקל בוקר">
        <input
          type="number"
          step="0.1"
          min="60"
          max="120"
          placeholder="לדוגמה: 77.8"
          value={form.weight_kg}
          onChange={e => set('weight_kg', e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-right text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </Section>

      {/* Breakfast */}
      <Section
        title="🥣 ארוחת בוקר"
        subtitle="סמן כל מה שאכלת — כמות ברירת מחדל: 2 ביצים, חצי אבוקדו, קפה"
        action={
          <button
            type="button"
            onClick={() => setBreakfastItems({ ...DEFAULT_BREAKFAST_ITEMS })}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            אפס
          </button>
        }
      >
        <div className="space-y-1.5">
          {BREAKFAST_ITEMS.map(item => {
            const qty = breakfastItems[item.id] ?? 0
            const checked = qty > 0
            const toggle = () => setBreakfastItems(prev => ({
              ...prev,
              [item.id]: checked ? 0 : item.defaultQty,
            }))
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-2.5 rounded-xl border-2 transition-all ${
                  checked ? 'border-gray-900 bg-gray-50' : 'border-gray-100'
                }`}
              >
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={toggle}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    checked ? 'border-gray-900 bg-gray-900' : 'border-gray-300'
                  }`}
                >
                  {checked && <span className="text-white text-[10px] font-bold leading-none">✓</span>}
                </button>

                {/* Name */}
                <button type="button" onClick={toggle} className="flex-1 text-right">
                  <span className={`text-sm font-medium ${checked ? 'text-gray-900' : 'text-gray-500'}`}>
                    {item.name}
                  </span>
                </button>

                {/* Nutrition or qty controls */}
                {checked ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setBreakfastItems(prev => ({ ...prev, [item.id]: Math.max(0, qty - 1) }))}
                      className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 text-base font-bold flex items-center justify-center leading-none"
                    >−</button>
                    <span className="text-sm font-bold text-gray-900 w-5 text-center tabular-nums">{qty}</span>
                    <button
                      type="button"
                      onClick={() => setBreakfastItems(prev => ({ ...prev, [item.id]: qty + 1 }))}
                      className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 text-base font-bold flex items-center justify-center leading-none"
                    >+</button>
                    <span className="text-xs text-emerald-600 font-medium min-w-[52px] text-left">
                      {item.protein * qty}g חלב'
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-300">{item.protein}g · {item.calories} קק"ל</span>
                )}
              </div>
            )
          })}
        </div>
      </Section>

      {/* Lunch */}
      <Section title="🍽️ צהריים">
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${dayInfo.bgClass} ${dayInfo.colorClass}`}>
            {hasCarbs ? '🌾 High Carb — עם פחמימות' : '🥗 Low Carb — ללא פחמימות'}
          </span>
        </div>
        <select
          value={form.lunch_option}
          onChange={e => set('lunch_option', e.target.value)}
          className="w-full border-2 border-gray-100 rounded-xl px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        >
          <option value="">בחר ארוחת צהריים</option>
          <optgroup label="מומלץ להיום">
            {lunchSuggestions.map(o => (
              <option key={o.id} value={o.id}>{o.name} ({o.protein}g · {o.calories} קק"ל)</option>
            ))}
          </optgroup>
          <optgroup label="כל האפשרויות">
            {LUNCH_OPTIONS.filter(o => !lunchSuggestions.includes(o)).map(o => (
              <option key={o.id} value={o.id}>{o.name} ({o.protein}g · {o.calories} קק"ל)</option>
            ))}
          </optgroup>
          <option value="custom">אחר — הקלד בחופשי...</option>
        </select>
        {form.lunch_option === 'custom' && (
          <input
            type="text"
            placeholder="תאר את ארוחת הצהריים..."
            value={form.lunch_custom}
            onChange={e => set('lunch_custom', e.target.value)}
            className="mt-3 w-full border-2 border-gray-900 rounded-xl px-3 py-2.5 text-right text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            autoFocus
          />
        )}
      </Section>

      {/* Snacks */}
      <Section title="🥜 חטיפים" subtitle="ביצים קשות, קוטג', פירות, אגוזים...">
        <input
          type="text"
          placeholder="קוטג' 250g, 2 ביצים קשות..."
          value={form.snacks}
          onChange={e => set('snacks', e.target.value)}
          className="w-full border-2 border-gray-100 rounded-xl px-3 py-2.5 text-right text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
      </Section>

      {/* Dinner */}
      <Section title="🌙 ארוחת ערב">
        <div className="space-y-2">
          {DINNER_OPTIONS.map(opt => (
            <label
              key={opt.id}
              className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
                form.dinner_option === opt.id
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  form.dinner_option === opt.id ? 'border-gray-900' : 'border-gray-300'
                }`}>
                  {form.dinner_option === opt.id && <div className="w-2 h-2 rounded-full bg-gray-900" />}
                </div>
                <input type="radio" name="dinner" value={opt.id} checked={form.dinner_option === opt.id}
                  onChange={() => set('dinner_option', opt.id)} className="sr-only" />
                <span className="text-sm text-gray-900 font-medium">{opt.name}</span>
              </div>
              {opt.id !== 'custom' && (
                <span className="text-xs text-gray-400 font-medium">{opt.protein}g · {opt.calories} קק"ל</span>
              )}
            </label>
          ))}
        </div>
        {form.dinner_option === 'custom' && (
          <input
            type="text"
            placeholder="תאר את ארוחת הערב..."
            value={form.dinner_custom}
            onChange={e => set('dinner_custom', e.target.value)}
            className="mt-3 w-full border-2 border-gray-900 rounded-xl px-3 py-2.5 text-right text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            autoFocus
          />
        )}
      </Section>

      {/* Workout */}
      <Section title="🏃 אימון">
        <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
          form.workout_done ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100'
        }`}>
          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            form.workout_done ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'
          }`}>
            {form.workout_done && <span className="text-white text-xs font-bold">✓</span>}
          </div>
          <input type="checkbox" checked={form.workout_done}
            onChange={e => set('workout_done', e.target.checked)} className="sr-only" />
          <span className={`text-sm font-medium ${form.workout_done ? 'text-emerald-700' : 'text-gray-600'}`}>
            {dayInfo.workout}
          </span>
        </label>
        {form.workout_done && (
          <div className="mt-3">
            <select
              value={form.workout_type}
              onChange={e => set('workout_type', e.target.value)}
              className="w-full border-2 border-gray-100 rounded-xl px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="gym_a">ג'ים A — רגליים + גב</option>
              <option value="gym_b">ג'ים B — חזה + כתפיים + טריצפס</option>
              <option value="swimming">שחייה</option>
              <option value="calisthenics">כושר גופני (Calisthenics)</option>
            </select>
          </div>
        )}
      </Section>

      {/* Notes */}
      <Section title="📒 הערות" subtitle="חריגות, תחושות, כל דבר שרצית לזכור">
        <textarea
          rows={2}
          placeholder="כתוב כאן..."
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          className="w-full border-2 border-gray-100 rounded-xl px-3 py-2.5 text-right text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
        />
      </Section>

      <button
        type="submit"
        disabled={saving || saved}
        className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
          saved
            ? 'bg-emerald-500 text-white scale-95'
            : saving
            ? 'bg-gray-300 text-gray-500 cursor-wait'
            : 'bg-gray-900 text-white hover:bg-gray-800 active:scale-95'
        }`}
      >
        {saved ? '✅ נשמר!' : saving ? 'שומר...' : 'שמור יומן'}
      </button>
    </form>
  )
}
