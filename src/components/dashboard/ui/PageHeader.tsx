import type { ReactNode } from 'react'

export function PageHeader({
  label,
  title,
  description,
  badge,
}: {
  label?: string
  title: string
  description?: string
  badge?: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-sky-400/20 bg-[linear-gradient(135deg,rgba(8,20,34,.96),rgba(4,9,18,.92))] p-6 lg:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          {label && <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-300">{label}</p>}
          <h1 className="mt-2 text-3xl font-black text-white">{title}</h1>
          {description && <p className="mt-2 max-w-xl text-sm leading-7 text-slate-300">{description}</p>}
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>
    </section>
  )
}
