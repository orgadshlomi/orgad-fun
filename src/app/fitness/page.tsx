'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  getDayInfo,
  getCurrentWeek,
  formatHebrewDate,
  PROTEIN_CHECKPOINTS,
  PLAN_START_WEIGHT,
  PLAN_TARGET_WEIGHT,
  BREAKFAST_OPTIONS,
  LUNCH_OPTIONS,
  DINNER_OPTIONS,
} from '@/lib/fitness-logic'
import type { DailyLog } from '@/lib/supabase'

function ProgressBar({ value, max, color = 'bg-emerald-500' }: { value: number; max: number; color?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function Stat({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  const pct = Math.min(100, Math.round((value / target) * 100))
  const color = pct >= 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-blue-500' : 'bg-amber-400'
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
      <div className="flex justify-between text-sm font-medium">
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-900">
          <strong>{value}</strong>
          <span className="text-gray-500"> / {target} {unit}</span>
        </span>
      </div>
      <ProgressBar value={value} max={target} color={color} />
      <p className="text-xs text-gray-500 text-left">{pct}%</p>
    </div>
  )
}

export default function FitnessDashboard() {
  const [log, setLog] = useState<DailyLog | null>(null)
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const dayInfo = getDayInfo(now)
  const week = getCurrentWeek(now)
  const hebrewDate = formatHebrewDate(now)
  const currentHour = now.getHours()

  useEffect(() => {
    fetch('/api/fitness/today')
      .then(r => r.json())
      .then(d => { setLog(d.log); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const protein = log?.protein_g ?? 0
  const calories = log?.calories_kcal ?? 0
  const carbs = log?.carbs_g ?? 0

  const nextCheckpoint = PROTEIN_CHECKPOINTS.find(cp => currentHour < cp.hour && protein < cp.target)

  const breakfastName = log?.breakfast_type
    ? BREAKFAST_OPTIONS.find(b => b.id === log.breakfast_type)?.name
    : null
  const lunchName = log?.lunch_option
    ? LUNCH_OPTIONS.find(l => l.id === log.lunch_option)?.name
    : null
  const dinnerName = log?.dinner_option
    ? DINNER_OPTIONS.find(d => d.id === log.dinner_option)?.name
    : null

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <p className="text-sm text-gray-500">{hebrewDate}</p>
        <h1 className="text-2xl font-bold text-gray-900">שלום שלומי 👋</h1>
        <p className="text-sm text-gray-500 mt-0.5">שבוע {week} מתוך 6 | יעד: {PLAN_TARGET_WEIGHT}ק"ג</p>
      </div>

      {/* Day Type Badge */}
      <div className={`rounded-xl border p-4 ${dayInfo.bgClass}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-medium ${dayInfo.colorClass}`}>{dayInfo.label}</p>
            <p className="text-gray-700 font-semibold mt-0.5">{dayInfo.emoji} {dayInfo.workout}</p>
          </div>
          <div className="text-right text-xs text-gray-500 space-y-0.5">
            <p>🔥 {dayInfo.calTarget} קק"ל</p>
            <p>💪 {dayInfo.proteinTarget}g חלבון</p>
            <p>🌾 {dayInfo.carbTarget}g פחמימות</p>
          </div>
        </div>
      </div>

      {/* Protein Checkpoints */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-900 mb-3">⏰ נקודות בקרה — חלבון</h2>
        <div className="space-y-2">
          {PROTEIN_CHECKPOINTS.map(cp => {
            const done = protein >= cp.target
            const active = !done && currentHour < cp.hour && nextCheckpoint?.id === cp.id
            return (
              <div
                key={cp.id}
                className={`flex items-center justify-between py-1.5 px-2 rounded-lg text-sm ${
                  done ? 'bg-emerald-50 text-emerald-700' : active ? 'bg-amber-50 text-amber-700' : 'text-gray-500'
                }`}
              >
                <span>{done ? '✅' : active ? '⏳' : '⬜'} {cp.label}</span>
                <span className="font-mono font-medium">{cp.target}g</span>
              </div>
            )
          })}
        </div>
        {nextCheckpoint && (
          <p className="mt-3 text-xs text-amber-600 font-medium">
            עוד {Math.max(0, nextCheckpoint.target - protein)}g עד {nextCheckpoint.label}
          </p>
        )}
      </div>

      {/* Progress Stats */}
      {loading ? (
        <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
      ) : (
        <div className="space-y-3">
          <Stat label="💪 חלבון" value={protein} target={dayInfo.proteinTarget} unit="g" />
          <Stat label="🔥 קלוריות" value={calories} target={dayInfo.calTarget} unit="קק&quot;ל" />
          <Stat label="🌾 פחמימות" value={carbs} target={dayInfo.carbTarget} unit="g" />
        </div>
      )}

      {/* Today's meals summary */}
      {log && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900 mb-3">🍽️ ארוחות היום</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">בוקר</span>
              <span className="text-gray-900">{breakfastName ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">צהריים</span>
              <span className="text-gray-900">{lunchName ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">ערב</span>
              <span className="text-gray-900">{dinnerName ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">אימון</span>
              <span className={log.workout_done ? 'text-emerald-600 font-medium' : 'text-gray-400'}>
                {log.workout_done ? `✅ ${log.workout_type ?? 'בוצע'}` : '—'}
              </span>
            </div>
            {log.weight_kg && (
              <div className="flex justify-between">
                <span className="text-gray-500">משקל</span>
                <span className="text-gray-900 font-medium">{log.weight_kg} ק"ג</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Link
          href="/fitness/log"
          className="flex-1 bg-gray-900 text-white text-center py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
        >
          {log ? '✏️ עדכן יומן' : '📝 רשום יומן'}
        </Link>
        <Link
          href="/fitness/weekly"
          className="flex-1 bg-white border border-gray-200 text-gray-700 text-center py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
        >
          📊 התקדמות
        </Link>
      </div>

      {/* Weight progress */}
      {log?.weight_kg && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">יעד משקל</span>
            <span className="font-medium text-gray-900">{log.weight_kg} → {PLAN_TARGET_WEIGHT} ק"ג</span>
          </div>
          <ProgressBar
            value={PLAN_START_WEIGHT - log.weight_kg}
            max={PLAN_START_WEIGHT - PLAN_TARGET_WEIGHT}
            color="bg-emerald-500"
          />
          <p className="text-xs text-gray-500 mt-1 text-left">
            ירידה: {(PLAN_START_WEIGHT - log.weight_kg).toFixed(1)} ק"ג | נשאר: {(log.weight_kg - PLAN_TARGET_WEIGHT).toFixed(1)} ק"ג
          </p>
        </div>
      )}
    </div>
  )
}
