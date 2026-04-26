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
  FOOD_ITEMS,
} from '@/lib/fitness-logic'
import type { DailyLog } from '@/lib/supabase'

function GoalBar({ label, value, target, unit, color, textColor }: {
  label: string; value: number; target: number; unit: string
  color: string; textColor: string
}) {
  const pct = Math.min(100, Math.round((value / target) * 100))
  const remaining = target - value
  const done = remaining <= 0
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-xs text-gray-400">{label}</span>
        <div className="flex items-baseline gap-0.5">
          <span className={`text-lg font-bold tabular-nums ${textColor}`}>{value}</span>
          <span className="text-xs text-gray-600">/{target}{unit}</span>
        </div>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2.5">
        <div className={`h-2.5 rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`text-xs mt-1 text-left ${done ? 'text-emerald-400 font-medium' : 'text-gray-500'}`}>
        {done ? '✓ הושג' : `נשאר ${remaining}${unit}`}
      </p>
    </div>
  )
}

function DailyGoals({ protein, calories, carbs, dayInfo, loading }: {
  protein: number; calories: number; carbs: number
  dayInfo: ReturnType<typeof getDayInfo>; loading: boolean
}) {
  const proteinPct = Math.min(100, Math.round((protein / dayInfo.proteinTarget) * 100))

  return (
    <div className="bg-gray-900 rounded-2xl p-5 text-white shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-sm text-gray-200">🎯 יעדי היום</h2>
        <span className="text-xs text-gray-400">{dayInfo.label}</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-12 bg-gray-800 rounded-xl animate-pulse" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-10 bg-gray-800 rounded-xl animate-pulse" />
            <div className="h-10 bg-gray-800 rounded-xl animate-pulse" />
          </div>
        </div>
      ) : (
        <>
          {/* Protein — hero metric */}
          <div className="mb-1">
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="text-sm text-gray-400">💪 חלבון</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold tabular-nums text-emerald-400">{protein}</span>
                <span className="text-sm text-gray-500">/ {dayInfo.proteinTarget}g</span>
              </div>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-4">
              <div
                className="h-4 bg-emerald-400 rounded-full transition-all duration-700 flex items-center justify-end"
                style={{ width: `${proteinPct}%` }}
              >
                {proteinPct > 15 && (
                  <span className="text-xs font-bold text-emerald-900 pr-2">{proteinPct}%</span>
                )}
              </div>
            </div>
            <p className={`text-xs mt-1 text-left ${protein >= dayInfo.proteinTarget ? 'text-emerald-400 font-medium' : 'text-gray-500'}`}>
              {protein >= dayInfo.proteinTarget ? '✓ יעד חלבון הושג!' : `נשאר ${dayInfo.proteinTarget - protein}g`}
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-700 my-3" />

          {/* Calories + Carbs */}
          <div className="grid grid-cols-2 gap-4">
            <GoalBar
              label="🔥 קלוריות" value={calories} target={dayInfo.calTarget} unit=""
              color="bg-orange-400" textColor="text-orange-300"
            />
            <GoalBar
              label="🌾 פחמימות" value={carbs} target={dayInfo.carbTarget} unit="g"
              color="bg-blue-400" textColor="text-blue-300"
            />
          </div>
        </>
      )}
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
            עוד {Math.max(0, nextCheckpoint.target - protein)}g עד {nextCheckpoint.label.replace('עד ', '')}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {PROTEIN_CHECKPOINTS.map((cp, i) => {
          const done = protein >= cp.target
          const active = !done && currentHour < cp.hour && nextCheckpoint?.id === cp.id
          return (
            <div key={cp.id} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full flex items-center">
                {i > 0 && (
                  <div className={`flex-1 h-0.5 ${protein >= PROTEIN_CHECKPOINTS[i - 1].target ? 'bg-emerald-400' : 'bg-gray-200'}`} />
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
    fetch('/api/fitness/today', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { setLog(d.log); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const protein = log?.protein_g ?? 0
  const calories = log?.calories_kcal ?? 0
  const carbs = log?.carbs_g ?? 0

  const foodName = log?.breakfast_type
    ? (() => {
        try {
          const parsed = JSON.parse(log.breakfast_type)
          if (Array.isArray(parsed)) {
            return parsed.map((e: { description: string }) => e.description).join(', ') || null
          }
          // legacy format
          return FOOD_ITEMS
            .filter(i => (parsed[i.id] ?? 0) > 0)
            .map(i => parsed[i.id] > 1 ? `${parsed[i.id]}× ${i.name}` : i.name)
            .join(', ') || null
        } catch { return null }
      })()
    : null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <p className="text-xs text-gray-400 font-medium">{hebrewDate}</p>
        <div className="flex items-center justify-between mt-0.5">
          <h1 className="text-2xl font-bold text-gray-900">שלום שלומי 👋</h1>
          <span className="text-sm text-gray-400">שבוע {week}/6</span>
        </div>
      </div>

      {/* Daily goals — hero */}
      <DailyGoals
        protein={protein} calories={calories} carbs={carbs}
        dayInfo={dayInfo} loading={loading}
      />

      {/* CTA */}
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

      {/* Day type + workout */}
      <div className={`rounded-2xl border-2 p-4 ${dayInfo.bgClass}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide ${dayInfo.colorClass}`}>{dayInfo.label}</p>
            <p className="text-gray-800 font-bold mt-0.5">{dayInfo.emoji} {dayInfo.workout}</p>
          </div>
          <span className={`text-3xl`}>{log?.workout_done ? '✅' : '⬜'}</span>
        </div>
      </div>

      {/* Protein checkpoints */}
      <CheckpointTimeline protein={protein} currentHour={currentHour} />

      {/* Today's log summary */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm">📋 יומן היום</h2>
          <Link href="/fitness/log" className="text-xs text-gray-400 hover:text-gray-600">עדכן ←</Link>
        </div>
        <div className="divide-y divide-gray-50">
          <Link href="/fitness/log" className="flex justify-between items-center px-4 py-3 text-sm hover:bg-gray-50 transition-colors">
            <span className="text-gray-400 w-14 flex-shrink-0">מזון</span>
            <span className={`text-left truncate max-w-[220px] ${foodName ? 'text-gray-800' : 'text-gray-300 italic'}`}>
              {foodName ?? '— לא נרשם'}
            </span>
          </Link>
          <Link href="/fitness/log" className="flex justify-between items-center px-4 py-3 text-sm hover:bg-gray-50 transition-colors">
            <span className="text-gray-400 w-14 flex-shrink-0">אימון</span>
            <span className={log?.workout_done ? 'text-emerald-600 font-medium' : 'text-gray-300 italic'}>
              {log?.workout_done ? '✅ בוצע' : '— לא נרשם'}
            </span>
          </Link>
          {log?.weight_kg && (
            <div className="flex justify-between items-center px-4 py-3 text-sm">
              <span className="text-gray-400 w-14">משקל</span>
              <span className="text-gray-800 font-semibold">{log.weight_kg} ק&quot;ג</span>
            </div>
          )}
        </div>
      </div>

      {/* Weight progress */}
      {log?.weight_kg && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500 font-medium">יעד משקל</span>
            <span className="font-bold text-gray-900">{log.weight_kg} → {PLAN_TARGET_WEIGHT} ק&quot;ג</span>
          </div>
          <div className="relative w-full bg-gray-100 rounded-full h-4 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-700"
              style={{ width: `${Math.min(100, ((PLAN_START_WEIGHT - log.weight_kg) / (PLAN_START_WEIGHT - PLAN_TARGET_WEIGHT)) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1.5">
            <span>ירד: {(PLAN_START_WEIGHT - log.weight_kg).toFixed(1)} ק&quot;ג</span>
            <span>נשאר: {(log.weight_kg - PLAN_TARGET_WEIGHT).toFixed(1)} ק&quot;ג</span>
          </div>
        </div>
      )}
    </div>
  )
}
