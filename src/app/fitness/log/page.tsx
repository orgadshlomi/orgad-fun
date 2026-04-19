'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getDayInfo,
  BREAKFAST_OPTIONS,
  LUNCH_OPTIONS,
  DINNER_OPTIONS,
  calcNutrition,
  toISODate,
} from '@/lib/fitness-logic'
import type { DailyLog } from '@/lib/supabase'

export default function LogPage() {
  const router = useRouter()
  const dayInfo = getDayInfo()
  const isHighCarb = dayInfo.dayType === 'high_carb'
  const lunchSuggestions = isHighCarb
    ? LUNCH_OPTIONS.filter(l => l.id.endsWith('_carbs'))
    : LUNCH_OPTIONS.filter(l => l.id.endsWith('_no'))

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    date: toISODate(new Date()),
    weight_kg: '',
    breakfast_type: 'B',
    lunch_option: lunchSuggestions[0]?.id ?? '',
    dinner_option: '',
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
        setForm(f => ({
          ...f,
          weight_kg: log.weight_kg?.toString() ?? '',
          breakfast_type: log.breakfast_type ?? 'B',
          lunch_option: log.lunch_option ?? lunchSuggestions[0]?.id ?? '',
          dinner_option: log.dinner_option ?? '',
          snacks: log.snacks ?? '',
          workout_done: log.workout_done,
          workout_type: log.workout_type ?? dayInfo.workoutType,
          notes: log.notes ?? '',
        }))
      })
  }, [])

  const { protein, calories, carbs } = calcNutrition(
    form.breakfast_type || null,
    form.lunch_option || null,
    form.dinner_option || null,
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await fetch('/api/fitness/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
          protein_g: protein,
          calories_kcal: calories,
          carbs_g: carbs,
          day_type: dayInfo.dayType,
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
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📝 יומן יומי</h1>
        <p className="text-sm text-gray-500 mt-0.5">{dayInfo.emoji} {dayInfo.label}</p>
      </div>

      {/* Live nutrition preview */}
      <div className="bg-gray-900 text-white rounded-xl p-4 flex justify-around text-center">
        <div>
          <p className="text-2xl font-bold">{protein}</p>
          <p className="text-xs text-gray-400">חלבון g</p>
        </div>
        <div className="border-r border-gray-700" />
        <div>
          <p className="text-2xl font-bold">{calories}</p>
          <p className="text-xs text-gray-400">קלוריות</p>
        </div>
        <div className="border-r border-gray-700" />
        <div>
          <p className="text-2xl font-bold">{carbs}</p>
          <p className="text-xs text-gray-400">פחמימות g</p>
        </div>
      </div>

      {/* Weight */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h2 className="font-semibold text-gray-900">⚖️ משקל (אופציונלי)</h2>
        <input
          type="number"
          step="0.1"
          min="60"
          max="120"
          placeholder="78.5"
          value={form.weight_kg}
          onChange={e => set('weight_kg', e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-right text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      {/* Breakfast */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h2 className="font-semibold text-gray-900">🥣 ארוחת בוקר</h2>
        <p className="text-xs text-gray-500">בסיס קבוע: 2 ביצים + אבוקדו + קפה (260 קק"ל, 12g חלבון)</p>
        <div className="space-y-2">
          {BREAKFAST_OPTIONS.map(opt => (
            <label
              key={opt.id}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                form.breakfast_type === opt.id ? 'border-gray-900 bg-gray-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="breakfast"
                  value={opt.id}
                  checked={form.breakfast_type === opt.id}
                  onChange={() => set('breakfast_type', opt.id)}
                  className="accent-gray-900"
                />
                <span className="text-sm text-gray-900">{opt.name}</span>
              </div>
              <span className="text-xs text-gray-500">{opt.protein}g • {opt.calories} קק"ל</span>
            </label>
          ))}
        </div>
      </div>

      {/* Lunch */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">🍽️ צהריים</h2>
          <span className={`text-xs px-2 py-0.5 rounded-full ${dayInfo.bgClass} ${dayInfo.colorClass}`}>
            {isHighCarb ? 'High Carb — עם פחמימות' : 'Low Carb — ללא פחמימות'}
          </span>
        </div>
        <select
          value={form.lunch_option}
          onChange={e => set('lunch_option', e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="">בחר ארוחת צהריים</option>
          <optgroup label="מומלץ להיום">
            {lunchSuggestions.map(o => (
              <option key={o.id} value={o.id}>{o.name} ({o.protein}g • {o.calories} קק"ל)</option>
            ))}
          </optgroup>
          <optgroup label="כל האפשרויות">
            {LUNCH_OPTIONS.filter(o => !lunchSuggestions.includes(o)).map(o => (
              <option key={o.id} value={o.id}>{o.name} ({o.protein}g • {o.calories} קק"ל)</option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Snacks */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
        <h2 className="font-semibold text-gray-900">🥜 חטיפים</h2>
        <input
          type="text"
          placeholder="למשל: קוטג' 250g, 2 ביצים קשות..."
          value={form.snacks}
          onChange={e => set('snacks', e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-right text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      {/* Dinner */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h2 className="font-semibold text-gray-900">🌙 ערב</h2>
        <div className="space-y-2">
          {DINNER_OPTIONS.map(opt => (
            <label
              key={opt.id}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                form.dinner_option === opt.id ? 'border-gray-900 bg-gray-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="dinner"
                  value={opt.id}
                  checked={form.dinner_option === opt.id}
                  onChange={() => set('dinner_option', opt.id)}
                  className="accent-gray-900"
                />
                <span className="text-sm text-gray-900">{opt.name}</span>
              </div>
              <span className="text-xs text-gray-500">{opt.protein}g • {opt.calories} קק"ל</span>
            </label>
          ))}
        </div>
      </div>

      {/* Workout */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h2 className="font-semibold text-gray-900">🏃 אימון</h2>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.workout_done}
            onChange={e => set('workout_done', e.target.checked)}
            className="w-5 h-5 rounded accent-gray-900"
          />
          <span className="text-gray-900">בוצע: {dayInfo.workout}</span>
        </label>
        {form.workout_done && (
          <select
            value={form.workout_type}
            onChange={e => set('workout_type', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="gym_a">ג'ים A — רגליים + גב</option>
            <option value="gym_b">ג'ים B — חזה + כתפיים + טריצפס</option>
            <option value="swimming">שחייה</option>
            <option value="calisthenics">כושר גופני (Calisthenics)</option>
          </select>
        )}
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
        <h2 className="font-semibold text-gray-900">📒 הערות</h2>
        <textarea
          rows={2}
          placeholder="חריגות, תחושות, הערות..."
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-right text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={saving || saved}
        className={`w-full py-4 rounded-xl font-bold text-lg transition-colors ${
          saved
            ? 'bg-emerald-500 text-white'
            : saving
            ? 'bg-gray-400 text-white cursor-wait'
            : 'bg-gray-900 text-white hover:bg-gray-800'
        }`}
      >
        {saved ? '✅ נשמר!' : saving ? 'שומר...' : 'שמור יומן'}
      </button>
    </form>
  )
}
