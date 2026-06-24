import type { ReactNode } from 'react'

export function DashboardPageHeader(input: {
  eyebrow: string
  title: string
  description: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300">{input.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white lg:text-4xl">{input.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">{input.description}</p>
      </div>
      {input.actions ? <div className="flex flex-wrap gap-3">{input.actions}</div> : null}
    </div>
  )
}

export function DashboardMetricCard(input: {
  label: string
  value: string | number
  tone?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate'
  detail?: string
}) {
  const tone = input.tone ?? 'slate'
  const tones: Record<typeof tone, string> = {
    cyan: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-200',
    emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200',
    amber: 'border-amber-500/20 bg-amber-500/10 text-amber-200',
    rose: 'border-rose-500/20 bg-rose-500/10 text-rose-200',
    slate: 'border-slate-700/50 bg-slate-900/50 text-slate-200',
  }
  return (
    <article className={`rounded-2xl border p-4 shadow-[0_18px_45px_rgba(0,0,0,0.18)] ${tones[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{input.label}</p>
      <p className="mt-3 text-2xl font-black text-white">{input.value}</p>
      {input.detail ? <p className="mt-2 text-xs leading-5 text-slate-400">{input.detail}</p> : null}
    </article>
  )
}

export function DashboardSectionPanel(input: {
  title: string
  eyebrow?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-[1.6rem] border border-slate-800/60 bg-slate-900/45 p-5 shadow-[0_22px_55px_rgba(0,0,0,0.18)]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          {input.eyebrow ? <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{input.eyebrow}</p> : null}
          <h2 className="mt-1 text-sm font-black uppercase tracking-[0.16em] text-slate-300">{input.title}</h2>
        </div>
        {input.actions ? <div className="flex flex-wrap gap-2">{input.actions}</div> : null}
      </div>
      {input.children}
    </section>
  )
}

export function DashboardStatusBadge(input: {
  value: string
  map?: Record<string, { label: string; className: string }>
}) {
  const normalized = input.value.toLowerCase()
  const fallbackMap = input.map ?? {
    working: { label: 'Wired', className: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-200' },
    completed: { label: 'Completed', className: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-200' },
    ready: { label: 'Ready', className: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-200' },
    partial: { label: 'Partial', className: 'border-amber-500/30 bg-amber-500/12 text-amber-200' },
    partially_wired: { label: 'Partial', className: 'border-amber-500/30 bg-amber-500/12 text-amber-200' },
    processing: { label: 'Processing', className: 'border-cyan-500/30 bg-cyan-500/12 text-cyan-200' },
    queued: { label: 'Queued', className: 'border-cyan-500/30 bg-cyan-500/12 text-cyan-200' },
    pending: { label: 'Pending', className: 'border-slate-700/60 bg-slate-800/60 text-slate-300' },
    failed: { label: 'Failed', className: 'border-rose-500/30 bg-rose-500/12 text-rose-200' },
    unavailable: { label: 'Unavailable', className: 'border-slate-700/60 bg-slate-800/60 text-slate-300' },
    provider_available_not_wired: { label: 'Provider available', className: 'border-slate-700/60 bg-slate-800/60 text-slate-300' },
    archived: { label: 'Archived', className: 'border-slate-700/60 bg-slate-800/60 text-slate-300' },
    cancelled: { label: 'Cancelled', className: 'border-slate-700/60 bg-slate-800/60 text-slate-300' },
    active: { label: 'Active', className: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-200' },
    suspended: { label: 'Suspended', className: 'border-amber-500/30 bg-amber-500/12 text-amber-200' },
  }
  const value = fallbackMap[normalized] ?? {
    label: input.value,
    className: 'border-slate-700/60 bg-slate-800/60 text-slate-300',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${value.className}`}>
      {value.label}
    </span>
  )
}

export function DashboardEmptyState(input: {
  title: string
  detail: string
  actions?: ReactNode
}) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-slate-700/70 bg-slate-900/25 p-10 text-center">
      <p className="text-base font-black text-slate-200">{input.title}</p>
      <p className="mt-3 text-sm leading-7 text-slate-500">{input.detail}</p>
      {input.actions ? <div className="mt-6 flex flex-wrap justify-center gap-3">{input.actions}</div> : null}
    </div>
  )
}
