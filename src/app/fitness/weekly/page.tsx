'use client'

import { useEffect, useState } from 'react'
import {
  getCurrentWeek,
  PLAN_START_WEIGHT,
  PLAN_TARGET_WEIGHT,
  PLAN_WEEKS,
} from '@/lib/fitness-logic'
import type { WeeklyMeasurement, DailyLog } from '@/lib/supabase'

type WeeklyData = {
  measurements: WeeklyMeasurement[]
  logs: Pick<DailyLog, 'date' | 'protein_g' | 'calories_kcal' | 'workout_done' | 'weight_kg'>[]
}

function WeekRow({ m, isCurrent }: { m: WeeklyMeasurement; isCurrent: boolean }) {
  return (
    <tr className={isCurrent ? 'bg-emerald-50' : ''}>
      <td className="py-3 px-3 text-right">
        <span className={`font-medium text-sm ${isCurrent ? 'text-emerald-700' : 'text-gray-700'}`}>
          {isCurrent ? '→ ' : ''}שבוע {m.week_number}
        </span>
      </td>
      <td className="py-3 px-3 text-center">
        <span className={`font-semibold ${m.weight_kg ? 'text-gray-900' : 'text-gray-300'}`}>
          {m.weight_kg ?? '—'}
        </span>
      </td>
      <td className="py-3 px-3 text-center text-gray-600">{m.waist_cm ?? '—'}</td>
      <td className="py-3 px-3 text-center">
        <span className={`text-sm font-medium ${(m.workouts_completed ?? 0) >= 3 ? 'text-emerald-600' : 'text-gray-500'}`}>
          {m.workouts_completed ?? '—'}
        </span>
      </td>
      <td className="py-3 px-3 text-center">
        {m.nutrition_score ? (
          <span className={`text-sm font-medium ${m.nutrition_score >= 7 ? 'text-emerald-600' : m.nutrition_score >= 5 ? 'text-amber-500' : 'text-red-400'}`}>
            {m.nutrition_score}/10
          </span>
        ) : '—'}
      </td>
    </tr>
  )
}

export default function WeeklyPage() {
  const [data, setData] = useState<WeeklyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const currentWeek = getCurrentWeek()

  const [form, setForm] = useState({
    week_number: currentWeek,
    date: new Date().toISOString().split('T')[0],
    weight_kg: '',
    waist_cm: '',
    body_fat_pct: '',
    workouts_completed: '',
    nutrition_score: '',
    notes: '',
  })

  useEffect(() => {
    fetch('/api/fitness/weekly')
      .then(r => r.json())
      .then((d: WeeklyData) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function saveWeekly(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/fitness/weekly', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        week_number: Number(form.week_number),
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        waist_cm: form.waist_cm ? parseFloat(form.waist_cm) : null,
        body_fat_pct: form.body_fat_pct ? parseFloat(form.body_fat_pct) : null,
        workouts_completed: form.workouts_completed ? parseInt(form.workouts_completed) : 0,
        nutrition_score: form.nutrition_score ? parseInt(form.nutrition_score) : null,
      }),
    })
    const updated = await fetch('/api/fitness/weekly').then(r => r.json())
    setData(updated)
    setSaving(false)
    setShowForm(false)
  }

  const lastWeight = data?.measurements.filter(m => m.weight_kg).at(-1)?.weight_kg
  const totalLost = lastWeight ? PLAN_START_WEIGHT - lastWeight : 0
  const avgProtein = data?.logs.length
    ? Math.round(data.logs.reduce((s, l) => s + (l.protein_g ?? 0), 0) / data.logs.length)
    : 0
  const workoutsTotal = data?.logs.filter(l => l.workout_done).length ?? 0
  const progressPct = Math.min(100, (totalLost / (PLAN_START_WEIGHT - PLAN_TARGET_WEIGHT)) * 100)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  if (loading) {
    return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📊 התקדמות</h1>
          <p className="text-sm text-gray-500">שבוע {currentWeek} מתוך {PLAN_WEEKS}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
        >
          + עדכן שבוע
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { value: totalLost > 0 ? `-${totalLost.toFixed(1)}` : '0', label: 'ק"ג ירידה', color: totalLost > 0 ? 'text-emerald-600' : 'text-gray-400' },
          { value: `${avgProtein}g`, label: 'חלבון ממוצע', color: avgProtein >= 120 ? 'text-emerald-600' : avgProtein >= 80 ? 'text-amber-500' : 'text-gray-400' },
          { value: String(workoutsTotal), label: 'אימונים', color: workoutsTotal >= 10 ? 'text-emerald-600' : 'text-blue-500' },
        ].map(({ value, label, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Target progress */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-sm font-semibold text-gray-700">יעד משקל</span>
          <span className="text-sm font-bold text-gray-900">
            {lastWeight ? `${lastWeight} ק"ג` : `${PLAN_START_WEIGHT} ק"ג`}
            <span className="text-gray-400 font-normal"> → {PLAN_TARGET_WEIGHT} ק"ג</span>
          </span>
        </div>
        <div className="relative w-full bg-gray-100 rounded-full h-5 overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-700 flex items-center justify-end pr-2"
            style={{ width: `${progressPct}%` }}
          >
            {totalLost > 0.5 && (
              <span className="text-white text-xs font-bold">{Math.round(progressPct)}%</span>
            )}
          </div>
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1.5">
          <span>{PLAN_START_WEIGHT} ק"ג</span>
          <span>{PLAN_TARGET_WEIGHT} ק"ג</span>
        </div>
      </div>

      {/* Weekly form */}
      {showForm && (
        <form onSubmit={saveWeekly} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
          <h2 className="font-semibold text-gray-900">📋 עדכון שבוע {currentWeek}</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'שבוע', key: 'week_number', type: 'number', placeholder: String(currentWeek) },
              { label: 'משקל (ק"ג)', key: 'weight_kg', type: 'number', placeholder: '77.5' },
              { label: 'מותניים (ס"מ)', key: 'waist_cm', type: 'number', placeholder: '90' },
              { label: '% שומן', key: 'body_fat_pct', type: 'number', placeholder: '22' },
              { label: 'אימונים', key: 'workouts_completed', type: 'number', placeholder: '3' },
              { label: 'תזונה (1-10)', key: 'nutrition_score', type: 'number', placeholder: '8' },
            ].map(field => (
              <div key={field.key} className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">{field.label}</label>
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  value={String((form as Record<string, string | number>)[field.key] ?? '')}
                  onChange={e => set(field.key, e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            ))}
          </div>
          <input
            type="text"
            placeholder="הערות..."
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-right text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors disabled:bg-gray-300"
          >
            {saving ? 'שומר...' : 'שמור'}
          </button>
        </form>
      )}

      {/* Measurements table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-3 px-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">שבוע</th>
                <th className="py-3 px-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">ק"ג</th>
                <th className="py-3 px-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">מותניים</th>
                <th className="py-3 px-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">אימונים</th>
                <th className="py-3 px-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">תזונה</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.measurements.map(m => (
                <WeekRow key={m.week_number} m={m} isCurrent={m.week_number === currentWeek} />
              ))}
              {(!data?.measurements.length) && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-gray-400 text-sm">
                    אין נתונים עדיין — עדכן מדידות שבועיות
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Last 7 days */}
      {(data?.logs?.length ?? 0) > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 className="font-semibold text-gray-900 mb-3 text-sm">📅 7 ימים אחרונים</h2>
          <div className="space-y-2">
            {data?.logs.slice(0, 7).map(log => (
              <div key={log.date} className="flex items-center justify-between text-sm py-1">
                <span className="text-gray-400 text-xs w-20">{log.date.slice(5)}</span>
                <div className="flex items-center gap-3">
                  <span className="text-gray-700 font-medium">💪 {log.protein_g ?? 0}g</span>
                  <span className="text-gray-500">🔥 {log.calories_kcal ?? 0}</span>
                  <span className="text-base">{log.workout_done ? '✅' : '❌'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
