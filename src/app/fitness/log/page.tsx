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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-50">
        <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

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

  const proteinPct = Math.min(100, Math.round((protein / dayInfo.proteinTarget) * 100))
  const calPct = Math.min(100, Math.round((calories / dayInfo.calTarget) * 100))

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
            <p className="text-2xl font-bold tabular-nums">{protein}<span className="text-xs text-gray-400 ml-0.5">g</span></p>
            <p className="text-xs text-gray-400">חלבון</p>
          </div>
          <div className="w-px bg-gray-700" />
          <div>
            <p className="text-2xl font-bold tabular-nums">{calories}</p>
            <p className="text-xs text-gray-400">קלוריות</p>
          </div>
          <div className="w-px bg-gray-700" />
          <div>
            <p className="text-2xl font-bold tabular-nums">{carbs}<span className="text-xs text-gray-400 ml-0.5">g</span></p>
            <p className="text-xs text-gray-400">פחמימות</p>
          </div>
        </div>
        {/* Mini progress bars */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-12 text-left">חלבון</span>
            <div className="flex-1 bg-gray-700 rounded-full h-1.5">
              <div className="h-1.5 bg-emerald-400 rounded-full transition-all" style={{ width: `${proteinPct}%` }} />
            </div>
            <span className="text-xs text-gray-400 w-8 text-right">{proteinPct}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-12 text-left">קלוריות</span>
            <div className="flex-1 bg-gray-700 rounded-full h-1.5">
              <div className="h-1.5 bg-orange-400 rounded-full transition-all" style={{ width: `${calPct}%` }} />
            </div>
            <span className="text-xs text-gray-400 w-8 text-right">{calPct}%</span>
          </div>
        </div>
      </div>

      {/* Weight */}
      <Section title="⚖️ משקל (אופציונלי)">
        <input
          type="number"
          step="0.1"
          min="60"
          max="120"
          placeholder="78.5 ק״ג"
          value={form.weight_kg}
          onChange={e => set('weight_kg', e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-right text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </Section>

      {/* Breakfast */}
      <Section title="🥣 ארוחת בוקר">
        <p className="text-xs text-gray-400 mb-3">בסיס קבוע: 2 ביצים + אבוקדו + קפה (260 קק"ל, 12g חלבון)</p>
        <div className="space-y-2">
          {BREAKFAST_OPTIONS.map(opt => (
            <label
              key={opt.id}
              className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
                form.breakfast_type === opt.id
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  form.breakfast_type === opt.id ? 'border-gray-900' : 'border-gray-300'
                }`}>
                  {form.breakfast_type === opt.id && <div className="w-2 h-2 rounded-full bg-gray-900" />}
                </div>
                <input type="radio" name="breakfast" value={opt.id} checked={form.breakfast_type === opt.id}
                  onChange={() => set('breakfast_type', opt.id)} className="sr-only" />
                <span className="text-sm text-gray-900 font-medium">{opt.name}</span>
              </div>
              <span className="text-xs text-gray-400 font-medium">{opt.protein}g · {opt.calories} קק"ל</span>
            </label>
          ))}
        </div>
      </Section>

      {/* Lunch */}
      <Section title="🍽️ צהריים">
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${dayInfo.bgClass} ${dayInfo.colorClass}`}>
            {isHighCarb ? '🌾 High Carb — עם פחמימות' : '🥗 Low Carb — ללא פחמימות'}
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
        </select>
      </Section>

      {/* Snacks */}
      <Section title="🥜 חטיפים">
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
              <span className="text-xs text-gray-400 font-medium">{opt.protein}g · {opt.calories} קק"ל</span>
            </label>
          ))}
        </div>
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
      <Section title="📒 הערות">
        <textarea
          rows={2}
          placeholder="חריגות, תחושות, הערות..."
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
