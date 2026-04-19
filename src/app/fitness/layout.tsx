import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Fitness Tracker — שלומי',
  description: 'מערכת מעקב כושר וחיטוב 6 שבועות',
}

export default function FitnessLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white/80 backdrop-blur border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/fitness" className="text-base font-bold text-gray-900 tracking-tight">
            💪 Fitness
          </Link>
          <nav className="flex gap-1 text-sm font-medium">
            {[
              { href: '/fitness', label: 'דשבורד', icon: '🏠' },
              { href: '/fitness/log', label: 'יומן', icon: '📝' },
              { href: '/fitness/weekly', label: 'שבועי', icon: '📊' },
            ].map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <span className="text-xs">{icon}</span>
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-5 pb-10">{children}</main>
    </div>
  )
}
