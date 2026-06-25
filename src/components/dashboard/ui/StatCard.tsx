import type { ReactNode } from 'react'

export function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: ReactNode
  label: string
  value: string | number
  sub?: string
  accent?: 'blue' | 'green' | 'amber' | 'red'
}) {
  const accentClass = {
    blue: 'text-sky-400',
    green: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
  }[accent ?? 'blue']

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4">
      <div className={`h-5 w-5 ${accentClass}`}>{icon}</div>
      <p className="mt-4 text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
      {sub && <p className="mt-1 text-[10px] text-slate-500">{sub}</p>}
    </div>
  )
}
