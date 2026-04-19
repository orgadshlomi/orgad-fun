import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Fitness Tracker — שלומי',
  description: 'מערכת מעקב כושר וחיטוב 6 שבועות',
}

export default function FitnessLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/fitness" className="text-lg font-bold text-gray-900">
            💪 Fitness
          </Link>
          <nav className="flex gap-4 text-sm font-medium">
            <Link href="/fitness" className="text-gray-600 hover:text-gray-900 transition-colors">
              דשבורד
            </Link>
            <Link href="/fitness/log" className="text-gray-600 hover:text-gray-900 transition-colors">
              יומן
            </Link>
            <Link href="/fitness/weekly" className="text-gray-600 hover:text-gray-900 transition-colors">
              שבועי
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
