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
  BREAKFAST_ITEMS,
  LUNCH_OPTIONS,
  DINNER_OPTIONS,
} from '@/lib/fitness-logic'
import type { DailyLog } from '@/lib/supabase'

function MacroRow({
  protein, calories, carbs,
  proteinTarget, calTarget, carbTarget,
}: {
  protein: number; calories: number; carbs: number
  proteinTarget: number; calTarget: number; carbTarget: number
}) {
  const items = [
    { label: 'חלבון', value: protein, target: proteinTarget, unit: 'g', color: 'bg-emerald-500', trackColor: 'bg-emerald-100', textColor: 'text-emerald-600' },
    { label: 'קלוריות', value: calories, target: calTarget, unit: '', color: 'bg-orange-400', trackColor: 'bg-orange-100', textColor: 'text-orange-500' },
    { label: 'פחמימות', value: carbs, target: carbTarget, unit: 'g', color: 'bg-blue-400', trackColor: 'bg-blue-100', textColor: 'text-blue-500' },
  ]
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className="grid grid-cols-3 gap-4">
        {items.map(({ label, value, target, unit, color, trackColor, textColor }) => {
          const pct = Math.min(100, Math.round((value / target) * 100))
          const remaining = target - value
          return (
            <div key={label} className="space-y-2">
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900 tabular-nums">
                  {value}<span className="text-xs font-normal text-gray-400">{unit}</span>
                </p>
                <p className="text-xs text-gray-400">מתוך {target}{unit}</p>
              </div>
              <div className={`w-full ${trackColor} rounded-full h-2.5`}>
                <div className={`h-2.5 rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
              </div>
              <p className={`text-center text-xs font-medium ${remaining > 0 ? textColor : 'text-emerald-600'}`}>
                {remaining > 0 ? `נשאר ${remaining}${unit}` : '✓ הושג'}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CheckpointTimeline({ protein, currentHour }: { protein: number; currentHour: number }) {
  const nextCheckpoint = PROTEIN_CHECKPOINTS.find(cp => currentHour < cp.hour && protein < cp.target)
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900 text-sm">⏰ נקודות בקרה — חלבון</h2>
        {nextCheckpoint && (
          <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full">
            עוד {Math.max(0, nextCheckpoint.target - protein)}g
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {PROTEIN_CHECKPOINTS.map((cp, i) => {
          const done = protein >= cp.target
          const active = !done && currentHour < cp.hour && nextCheckpoint?.id === cp.id
          return (
            <div key={cp.id} className="flex-1 flex flex-col items-center gap-1.5">
              {/* Connector line + dot */}
              <div className="w-full flex items-center">
                {i > 0 && (
                  <div className={`flex-1 h-0.5 ${
                    protein >= PROTEIN_CHECKPOINTS[i - 1].target ? 'bg-emerald-400' : 'bg-gray-200'
                  }`} />
                )}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  done ? 'bg-emerald-500 text-white' :
                  active ? 'bg-amber-400 text-white ring-2 ring-amber-200' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {done ? '✓' : cp.target}
                </div>
                {i < PROTEIN_CHECKPOINTS.length - 1 && (
                  <div className={`flex-1 h-0.5 ${done ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                )}
              </div>
              <p className={`text-xs text-center leading-tight ${
                done ? 'text-emerald-600' : active ? 'text-amber-600 font-medium' : 'text-gray-400'
              }`}>{cp.label.replace('עד ', '')}</p>
            </div>
          )
        })}
      </div>
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

  const breakfastName = log?.breakfast_type
    ? (() => {
        try {
          const items: Record<string, number> = JSON.parse(log.breakfast_type)
          return BREAKFAST_ITEMS
            .filter(i => (items[i.id] ?? 0) > 0)
            .map(i => items[i.id] > 1 ? `${items[i.id]}× ${i.name}` : i.name)
            .join(', ')
        } catch { return null }
      })()
    : null
  const lunchName = log?.lunch_option
    ? LUNCH_OPTIONS.find(l => l.id === log.lunch_option)?.name
    : null
  const dinnerName = log?.dinner_option
    ? DINNER_OPTIONS.find(d => d.id === log.dinner_option)?.name
    : null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{hebrewDate}</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-0.5">שלום שלומי 👋</h1>
        <p className="text-sm text-gray-500">שבוע {week} מתוך 6 · יעד: {PLAN_TARGET_WEIGHT} ק"ג</p>
      </div>

      {/* Day Type Card */}
      <div className={`rounded-2xl border-2 p-4 ${dayInfo.bgClass}`}>
        <div className="flex items-start justify-between">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide ${dayInfo.colorClass}`}>{dayInfo.label}</p>
            <p className="text-gray-800 font-bold text-lg mt-0.5">{dayInfo.emoji} {dayInfo.workout}</p>
          </div>
          <div className="text-left flex gap-3 mt-0.5">
            <div className="text-center">
              <p className={`text-lg font-bold ${dayInfo.colorClass}`}>{dayInfo.calTarget}</p>
              <p className="text-xs text-gray-500">קק"ל</p>
            </div>
            <div className="text-center">
              <p className={`text-lg font-bold ${dayInfo.colorClass}`}>{dayInfo.proteinTarget}g</p>
              <p className="text-xs text-gray-500">חלבון</p>
            </div>
            <div className="text-center">
              <p className={`text-lg font-bold ${dayInfo.colorClass}`}>{dayInfo.carbTarget}g</p>
              <p className="text-xs text-gray-500">פחמ'</p>
            </div>
          </div>
        </div>
      </div>

      {/* Primary CTA — moved up */}
      <div className="flex gap-3">
        <Link
          href="/fitness/log"
          className={`flex-1 text-white text-center py-3.5 rounded-xl font-bold text-base hover:opacity-90 transition-opacity ${
            log ? 'bg-gray-900' : 'bg-emerald-600'
          }`}
        >
          {log ? '✏️ עדכן יומן' : '📝 רשום יומן'}
        </Link>
        <Link
          href="/fitness/weekly"
          className="px-5 bg-white border border-gray-200 text-gray-700 text-center py-3.5 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
        >
          📊
        </Link>
      </div>

      {/* Checkpoint Timeline */}
      <CheckpointTimeline protein={protein} currentHour={currentHour} />

      {/* Macro Progress */}
      {loading ? (
        <div className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
      ) : (
        <MacroRow
          protein={protein} calories={calories} carbs={carbs}
          proteinTarget={dayInfo.proteinTarget} calTarget={dayInfo.calTarget} carbTarget={dayInfo.carbTarget}
        />
      )}

      {/* Today's meals */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm">🍽️ ארוחות היום</h2>
          <Link href="/fitness/log" className="text-xs text-gray-400 hover:text-gray-600">עדכן ←</Link>
        </div>
        <div className="divide-y divide-gray-50">
          {[
            { label: 'בוקר', value: breakfastName },
            { label: 'צהריים', value: lunchName },
            { label: 'ערב', value: dinnerName },
          ].map(({ label, value }) => (
            <Link key={label} href="/fitness/log" className="flex justify-between items-center px-4 py-3 text-sm hover:bg-gray-50 transition-colors">
              <span className="text-gray-400 w-14 flex-shrink-0">{label}</span>
              <span className={`text-left truncate ${value ? 'text-gray-800' : 'text-gray-300 italic'}`}>
                {value ?? '— לא נרשם'}
              </span>
            </Link>
          ))}
          <Link href="/fitness/log" className="flex justify-between items-center px-4 py-3 text-sm hover:bg-gray-50 transition-colors">
            <span className="text-gray-400 w-14 flex-shrink-0">אימון</span>
            <span className={log?.workout_done ? 'text-emerald-600 font-medium' : 'text-gray-300 italic'}>
              {log?.workout_done ? '✅ בוצע' : '— לא נרשם'}
            </span>
          </Link>
          {log?.weight_kg && (
            <div className="flex justify-between items-center px-4 py-3 text-sm">
              <span className="text-gray-400 w-14">משקל</span>
              <span className="text-gray-800 font-semibold">{log.weight_kg} ק"ג</span>
            </div>
          )}
        </div>
      </div>

      {/* Weight progress */}
      {log?.weight_kg && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex justify-between text-sm mb-3">
            <span className="text-gray-500 font-medium">יעד משקל</span>
            <span className="font-bold text-gray-900">{log.weight_kg} → {PLAN_TARGET_WEIGHT} ק"ג</span>
          </div>
          <div className="relative w-full bg-gray-100 rounded-full h-4 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-700 flex items-center justify-end pr-2"
              style={{ width: `${Math.min(100, ((PLAN_START_WEIGHT - log.weight_kg) / (PLAN_START_WEIGHT - PLAN_TARGET_WEIGHT)) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1.5">
            <span>ירד: {(PLAN_START_WEIGHT - log.weight_kg).toFixed(1)} ק"ג</span>
            <span>נשאר: {(log.weight_kg - PLAN_TARGET_WEIGHT).toFixed(1)} ק"ג</span>
          </div>
        </div>
      )}
    </div>
  )
}
