'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getDayInfo,
  FOOD_ITEMS,
  DEFAULT_BREAKFAST_ITEMS,
  calcFoodNutrition,
  toISODate,
} from '@/lib/fitness-logic'
import type { FoodItem } from '@/lib/fitness-logic'
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

function FoodChecklist({ items, values, onChange, customValue, onCustomChange }: {
  items: FoodItem[]
  values: Record<string, number>
  onChange: (v: Record<string, number>) => void
  customValue: string
  onCustomChange: (v: string) => void
}) {
  return (
    <div className="space-y-1.5">
      {items.map(item => {
        const qty = values[item.id] ?? 0
        const checked = qty > 0
        const toggle = () => onChange({ ...values, [item.id]: checked ? 0 : item.defaultQty })
        return (
          <div
            key={item.id}
            className={`flex items-center gap-3 p-2.5 rounded-xl border-2 transition-all ${
              checked ? 'border-gray-900 bg-gray-50' : 'border-gray-100'
            }`}
          >
            <button
              type="button"
              onClick={toggle}
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                checked ? 'border-gray-900 bg-gray-900' : 'border-gray-300'
              }`}
            >
              {checked && <span className="text-white text-[10px] font-bold leading-none">✓</span>}
            </button>
            <button type="button" onClick={toggle} className="flex-1 text-right">
              <span className={`text-sm font-medium ${checked ? 'text-gray-900' : 'text-gray-500'}`}>
                {item.name}
              </span>
            </button>
            {checked ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onChange({ ...values, [item.id]: Math.max(0, qty - 1) })}
                  className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 text-base font-bold flex items-center justify-center leading-none"
                >−</button>
                <span className="text-sm font-bold text-gray-900 w-5 text-center tabular-nums">{qty}</span>
                <button
                  type="button"
                  onClick={() => onChange({ ...values, [item.id]: qty + 1 })}
                  className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 text-base font-bold flex items-center justify-center leading-none"
                >+</button>
                <span className="text-xs text-emerald-600 font-medium min-w-[52px] text-left">
                  {item.protein * qty}g חלב&apos;
                </span>
              </div>
            ) : (
              <span className="text-xs text-gray-300">{item.protein}g · {item.calories} קק&quot;ל</span>
            )}
          </div>
        )
      })}
      <input
        type="text"
        placeholder="אחר... (קרואסון, פיצה, וכו׳)"
        value={customValue}
        onChange={e => onCustomChange(e.target.value)}
        className="w-full border-2 border-dashed border-gray-200 rounded-xl px-3 py-2 text-right text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent placeholder:text-gray-300 mt-1"
      />
    </div>
  )
}

export default function LogPage() {
  const router = useRouter()
  const dayInfo = getDayInfo()

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [foodItems, setFoodItems] = useState<Record<string, number>>({ ...DEFAULT_BREAKFAST_ITEMS })
  const [foodCustom, setFoodCustom] = useState('')
  const [form, setForm] = useState({
    date: toISODate(new Date()),
    weight_kg: '',
    workout_done: false,
    workout_type: dayInfo.workoutType,
    workout_duration: '45',
    workout_notes: '',
    notes: '',
  })

  useEffect(() => {
    fetch('/api/fitness/today')
      .then(r => r.json())
      .then(({ log }: { log: DailyLog | null }) => {
        if (!log) return
        if (log.breakfast_type) {
          try {
            const p = JSON.parse(log.breakfast_type)
            if (typeof p === 'object') setFoodItems(p)
          } catch {}
        }
        setForm(f => ({
          ...f,
          weight_kg: log.weight_kg?.toString() ?? '',
          workout_done: log.workout_done,
          workout_type: log.workout_type ?? dayInfo.workoutType,
          notes: (log.notes ?? '').split('\n').filter(l => !l.match(/^[🍳🍽️🌙]/u)).join('\n').trim(),
        }))
      })
  }, [])

  const { protein, calories, carbs } = calcFoodNutrition(foodItems)
  const proteinPct = Math.min(100, Math.round((protein / dayInfo.proteinTarget) * 100))
  const calPct = Math.min(100, Math.round((calories / dayInfo.calTarget) * 100))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const workoutLine = form.workout_done && (form.workout_duration || form.workout_notes)
      ? `🏃 אימון: ${form.workout_duration ? form.workout_duration + ' דקות' : ''}${form.workout_notes ? ' — ' + form.workout_notes : ''}`
      : null
    const customNotes = [
      workoutLine,
      foodCustom && `🍴 ${foodCustom}`,
      form.notes,
    ].filter(Boolean).join('\n')
    try {
      const res = await fetch('/api/fitness/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: form.date,
          weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
          breakfast_type: JSON.stringify(foodItems),
          lunch_option: null,
          dinner_option: null,
          protein_g: protein,
          calories_kcal: calories,
          carbs_g: carbs,
          workout_done: form.workout_done,
          workout_type: form.workout_type,
          day_type: dayInfo.dayType,
          notes: customNotes,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(`שגיאה בשמירה: ${err.error ?? res.status}`)
        return
      }
      setSaved(true)
      setTimeout(() => { router.push('/fitness'); router.refresh() }, 1200)
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

      {/* Food — unified daily list */}
      <Section
        title="🍽️ מה אכלת היום"
        action={
          <button
            type="button"
            onClick={() => { setFoodItems({ ...DEFAULT_BREAKFAST_ITEMS }); setFoodCustom('') }}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            אפס
          </button>
        }
      >
        <FoodChecklist
          items={FOOD_ITEMS}
          values={foodItems}
          onChange={setFoodItems}
          customValue={foodCustom}
          onCustomChange={setFoodCustom}
        />
      </Section>

      {/* Workout */}
      <Section title="🏋️ אימון">
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
          <div>
            <p className={`text-sm font-medium ${form.workout_done ? 'text-emerald-700' : 'text-gray-600'}`}>
              {form.workout_done ? 'אימון בוצע ✅' : 'סמן אם עשית אימון היום'}
            </p>
            {!form.workout_done && (
              <p className="text-xs text-gray-400 mt-0.5">מתוכנן: {dayInfo.workout}</p>
            )}
          </div>
        </label>

        {form.workout_done && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">סוג אימון</label>
                <select
                  value={form.workout_type}
                  onChange={e => set('workout_type', e.target.value)}
                  className="w-full border-2 border-gray-100 rounded-xl px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="gym_a">ג&apos;ים A — רגליים + גב</option>
                  <option value="gym_b">ג&apos;ים B — חזה + כתפיים</option>
                  <option value="gym_mixed">ג&apos;ים — מעורב / אחר</option>
                  <option value="swimming">שחייה</option>
                  <option value="calisthenics">כושר גופני</option>
                  <option value="walking">הליכה</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">משך (דקות)</label>
                <select
                  value={form.workout_duration}
                  onChange={e => set('workout_duration', e.target.value)}
                  className="w-full border-2 border-gray-100 rounded-xl px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  {['20','30','40','45','50','60','75','90'].map(d => (
                    <option key={d} value={d}>{d} דקות</option>
                  ))}
                </select>
              </div>
            </div>
            <input
              type="text"
              placeholder="מה עשית? לדוגמה: סקוואט, בנץ', כתפיים, בטן..."
              value={form.workout_notes}
              onChange={e => set('workout_notes', e.target.value)}
              className="w-full border-2 border-gray-100 rounded-xl px-3 py-2.5 text-right text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
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
