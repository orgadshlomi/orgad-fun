'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getDayInfo,
  calcFoodNutrition,
  toISODate,
} from '@/lib/fitness-logic'
import type { DailyLog } from '@/lib/supabase'

type FoodEntry = {
  id: string
  description: string
  protein: number
  calories: number
  carbs: number
}

function Section({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-50">
        <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function uid() {
  return Math.random().toString(36).slice(2)
}

function imageToBase64(file: File): Promise<{ data: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const [header, data] = result.split(',')
      const mediaType = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
      resolve({ data, mediaType })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function LogPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dayInfo = getDayInfo()

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [entries, setEntries] = useState<FoodEntry[]>([])
  const [input, setInput] = useState('')
  const [pendingImage, setPendingImage] = useState<{ data: string; mediaType: string; preview: string } | null>(null)
  const [parsing, setParsing] = useState(false)
  const [clarificationQ, setClarificationQ] = useState<string | null>(null)
  const [clarificationCtx, setClarificationCtx] = useState('')
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
    fetch('/api/fitness/today', { cache: 'no-store' })
      .then(r => r.json())
      .then(({ log }: { log: DailyLog | null }) => {
        if (!log) return
        if (log.breakfast_type) {
          try {
            const parsed = JSON.parse(log.breakfast_type)
            // New format: array of FoodEntry
            if (Array.isArray(parsed)) {
              setEntries(parsed)
            } else if (typeof parsed === 'object') {
              // Old format: Record<string,number> — convert to single summary entry
              const { protein, calories, carbs } = calcFoodNutrition(parsed)
              if (protein + calories > 0) {
                setEntries([{ id: uid(), description: 'ארוחות קודמות', protein, calories, carbs }])
              }
            }
          } catch {}
        }
        setForm(f => ({
          ...f,
          weight_kg: log.weight_kg?.toString() ?? '',
          workout_done: log.workout_done,
          workout_type: log.workout_type ?? dayInfo.workoutType,
          notes: (log.notes ?? '').split('\n').filter((l: string) => !l.match(/^[🍳🍽️🌙🏃🍴]/u)).join('\n').trim(),
        }))
      })
  }, [])

  const totalProtein = entries.reduce((s, e) => s + e.protein, 0)
  const totalCalories = entries.reduce((s, e) => s + e.calories, 0)
  const totalCarbs = entries.reduce((s, e) => s + e.carbs, 0)
  const proteinPct = Math.min(100, Math.round((totalProtein / dayInfo.proteinTarget) * 100))
  const calPct = Math.min(100, Math.round((totalCalories / dayInfo.calTarget) * 100))

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const { data, mediaType } = await imageToBase64(file)
    const preview = URL.createObjectURL(file)
    setPendingImage({ data, mediaType, preview })
    setClarificationQ(null)
    setClarificationCtx('')
  }

  async function parseFood(opts?: { clarificationAnswer?: string }) {
    if (!input.trim() && !pendingImage) return
    setParsing(true)
    setClarificationQ(null)
    try {
      const body: Record<string, string> = {}
      if (pendingImage) {
        body.image_base64 = pendingImage.data
        body.image_media_type = pendingImage.mediaType
      }
      if (input.trim()) body.text = input.trim()
      if (opts?.clarificationAnswer) {
        body.clarification_context = `Original: ${clarificationCtx}\nAnswer: ${opts.clarificationAnswer}`
        body.text = input.trim() || 'see image'
      }

      const res = await fetch('/api/fitness/parse-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (data.question) {
        setClarificationQ(data.question)
        setClarificationCtx(input.trim())
        return
      }

      if (data.protein_g != null) {
        setEntries(prev => [...prev, {
          id: uid(),
          description: data.description ?? input.trim(),
          protein: Math.round(data.protein_g),
          calories: Math.round(data.calories_kcal),
          carbs: Math.round(data.carbs_g ?? 0),
        }])
        setInput('')
        setPendingImage(null)
        setClarificationQ(null)
        setClarificationCtx('')
        if (fileInputRef.current) fileInputRef.current.value = ''
      } else {
        alert('לא הצלחתי לנתח את המזון. נסה שוב עם תיאור אחר.')
      }
    } catch {
      alert('שגיאה בניתוח המזון')
    } finally {
      setParsing(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const workoutLine = form.workout_done
      ? `🏃 אימון: ${form.workout_duration} דקות${form.workout_notes ? ' — ' + form.workout_notes : ''}`
      : null
    const customNotes = [workoutLine, form.notes].filter(Boolean).join('\n')
    try {
      const res = await fetch('/api/fitness/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: form.date,
          weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
          breakfast_type: JSON.stringify(entries),
          lunch_option: null,
          dinner_option: null,
          protein_g: totalProtein,
          calories_kcal: totalCalories,
          carbs_g: totalCarbs,
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

      {/* Live sticky bar */}
      <div className="sticky top-[57px] z-10 bg-gray-900 text-white rounded-2xl p-4 shadow-lg">
        <div className="flex justify-around text-center mb-3">
          <div>
            <p className="text-2xl font-bold tabular-nums text-emerald-400">{totalProtein}<span className="text-sm text-gray-400">g</span></p>
            <p className="text-xs text-gray-400">חלבון</p>
            <p className="text-xs text-gray-500">מתוך {dayInfo.proteinTarget}g</p>
          </div>
          <div className="w-px bg-gray-700" />
          <div>
            <p className="text-2xl font-bold tabular-nums text-orange-300">{totalCalories}</p>
            <p className="text-xs text-gray-400">קלוריות</p>
            <p className="text-xs text-gray-500">מתוך {dayInfo.calTarget}</p>
          </div>
          <div className="w-px bg-gray-700" />
          <div>
            <p className="text-2xl font-bold tabular-nums text-blue-300">{totalCarbs}<span className="text-sm text-gray-400">g</span></p>
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
              {proteinPct < 100 ? `נשאר ${dayInfo.proteinTarget - totalProtein}g` : '✓ הושג'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-700 rounded-full h-2">
              <div className="h-2 bg-orange-400 rounded-full transition-all" style={{ width: `${calPct}%` }} />
            </div>
            <span className="text-xs text-gray-400 w-16 text-left">
              {calPct < 100 ? `נשאר ${dayInfo.calTarget - totalCalories}` : '✓ הושג'}
            </span>
          </div>
        </div>
      </div>

      {/* Weight */}
      <Section title="⚖️ משקל בוקר">
        <input
          type="number" step="0.1" min="60" max="120" placeholder="לדוגמה: 77.8"
          value={form.weight_kg} onChange={e => set('weight_kg', e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-right text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </Section>

      {/* Food */}
      <Section title="🍽️ מה אכלת היום" subtitle="כתוב כל מה שאכלת, או צלם את הצלחת">
        {/* Input row */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="2 ביצים, חצי אבוקדו, קפה..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); parseFood() } }}
            className="flex-1 border-2 border-gray-100 rounded-xl px-3 py-2.5 text-right text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          {/* Camera button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-11 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center flex-shrink-0 transition-colors"
            title="צלם ארוחה"
          >
            📷
          </button>
          {/* Add button */}
          <button
            type="button"
            onClick={() => parseFood()}
            disabled={parsing || (!input.trim() && !pendingImage)}
            className="px-4 h-11 rounded-xl bg-gray-900 text-white text-sm font-bold disabled:bg-gray-300 hover:bg-gray-800 transition-colors flex-shrink-0"
          >
            {parsing ? '...' : 'הוסף'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImagePick}
            className="hidden"
          />
        </div>

        {/* Image preview */}
        {pendingImage && (
          <div className="mb-3 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pendingImage.preview} alt="meal" className="w-full max-h-48 object-cover rounded-xl" />
            <button
              type="button"
              onClick={() => { setPendingImage(null); setClarificationQ(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
              className="absolute top-2 left-2 w-7 h-7 bg-black/60 text-white rounded-full text-xs font-bold flex items-center justify-center"
            >✕</button>
          </div>
        )}

        {/* Clarification */}
        {clarificationQ && (
          <div className="mb-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-sm text-amber-800 font-medium mb-2">🤔 {clarificationQ}</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="תשובה..."
                className="flex-1 border border-amber-300 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-amber-400"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    parseFood({ clarificationAnswer: (e.target as HTMLInputElement).value })
                  }
                }}
                autoFocus
              />
              <button
                type="button"
                onClick={e => {
                  const inp = (e.currentTarget.previousElementSibling as HTMLInputElement)
                  parseFood({ clarificationAnswer: inp.value })
                }}
                className="px-3 py-2 bg-amber-500 text-white text-sm font-bold rounded-lg"
              >שלח</button>
            </div>
          </div>
        )}

        {/* Parsing spinner */}
        {parsing && (
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3 animate-pulse">
            <span>🔍 מנתח...</span>
          </div>
        )}

        {/* Entries list */}
        {entries.length > 0 ? (
          <div className="space-y-1.5">
            {entries.map(entry => (
              <div key={entry.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{entry.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    💪 {entry.protein}g · 🔥 {entry.calories} קק&quot;ל · 🌾 {entry.carbs}g
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEntries(prev => prev.filter(e => e.id !== entry.id))}
                  className="w-7 h-7 rounded-full bg-gray-200 hover:bg-red-100 text-gray-400 hover:text-red-500 text-sm font-bold flex items-center justify-center flex-shrink-0 transition-colors"
                >✕</button>
              </div>
            ))}
            {/* Totals row */}
            <div className="flex justify-between text-xs font-semibold text-gray-500 px-3 pt-1 border-t border-gray-100">
              <span>סה&quot;כ:</span>
              <span>💪 {totalProtein}g · 🔥 {totalCalories} · 🌾 {totalCarbs}g</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-300 text-center py-4">עדיין לא נרשם מזון להיום</p>
        )}
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
                <select value={form.workout_type} onChange={e => set('workout_type', e.target.value)}
                  className="w-full border-2 border-gray-100 rounded-xl px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
                  <option value="gym_a">ג&apos;ים A — רגליים + גב</option>
                  <option value="gym_b">ג&apos;ים B — חזה + כתפיים</option>
                  <option value="gym_mixed">ג&apos;ים — מעורב</option>
                  <option value="swimming">שחייה</option>
                  <option value="calisthenics">כושר גופני</option>
                  <option value="walking">הליכה</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">משך (דקות)</label>
                <select value={form.workout_duration} onChange={e => set('workout_duration', e.target.value)}
                  className="w-full border-2 border-gray-100 rounded-xl px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
                  {['20','30','40','45','50','60','75','90'].map(d => (
                    <option key={d} value={d}>{d} דקות</option>
                  ))}
                </select>
              </div>
            </div>
            <input type="text" placeholder="מה עשית? סקוואט, בנץ'..."
              value={form.workout_notes} onChange={e => set('workout_notes', e.target.value)}
              className="w-full border-2 border-gray-100 rounded-xl px-3 py-2.5 text-right text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
        )}
      </Section>

      {/* Notes */}
      <Section title="📒 הערות">
        <textarea rows={2} placeholder="כתוב כאן..."
          value={form.notes} onChange={e => set('notes', e.target.value)}
          className="w-full border-2 border-gray-100 rounded-xl px-3 py-2.5 text-right text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
        />
      </Section>

      <button type="submit" disabled={saving || saved}
        className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
          saved ? 'bg-emerald-500 text-white scale-95'
          : saving ? 'bg-gray-300 text-gray-500 cursor-wait'
          : 'bg-gray-900 text-white hover:bg-gray-800 active:scale-95'
        }`}>
        {saved ? '✅ נשמר!' : saving ? 'שומר...' : 'שמור יומן'}
      </button>
    </form>
  )
}
