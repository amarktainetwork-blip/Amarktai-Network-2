'use client'

import { type ReactNode } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, HelpCircle, Loader2, XCircle } from 'lucide-react'

// ── StatusBadge ────────────────────────────────────────────────────────────────

export type StatusLevel = 'healthy' | 'warning' | 'critical' | 'unknown' | 'ready' | 'pending' | 'approved' | 'rejected' | 'draft' | 'active' | 'failed' | 'needs_changes' | 'published'

const STATUS_STYLES: Record<string, string> = {
  healthy:       'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  ready:         'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  approved:      'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  published:     'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  active:        'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  warning:       'border-amber-400/25 bg-amber-400/10 text-amber-300',
  pending:       'border-amber-400/25 bg-amber-400/10 text-amber-300',
  needs_changes: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
  draft:         'border-slate-600/50 bg-slate-800/50 text-slate-400',
  unknown:       'border-slate-600/50 bg-slate-800/50 text-slate-400',
  critical:      'border-red-400/25 bg-red-400/10 text-red-300',
  rejected:      'border-red-400/25 bg-red-400/10 text-red-300',
  failed:        'border-red-400/25 bg-red-400/10 text-red-300',
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const styles = STATUS_STYLES[status] ?? STATUS_STYLES.unknown
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${styles}`}>
      {label ?? status.replace(/_/g, ' ')}
    </span>
  )
}

// ── StatCard ───────────────────────────────────────────────────────────────────

export function StatCard({ label, value, icon, sub }: { label: string; value: string | number; icon?: ReactNode; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4">
      {icon && <div className="h-5 w-5 text-cyan-300">{icon}</div>}
      <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>}
    </div>
  )
}

// ── LoadingState ───────────────────────────────────────────────────────────────

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-12 justify-center text-slate-400">
      <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
      <span className="text-sm font-bold">{label}</span>
    </div>
  )
}

// ── ErrorState ─────────────────────────────────────────────────────────────────

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <XCircle className="h-8 w-8 text-red-400" />
      <p className="text-sm font-bold text-red-300">{message}</p>
      {retry && (
        <button onClick={retry} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-700">
          Retry
        </button>
      )}
    </div>
  )
}

// ── EmptyState ─────────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      {icon && <div className="text-slate-600">{icon}</div>}
      <div>
        <p className="font-black text-slate-300">{title}</p>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  )
}

// ── PageHeader ─────────────────────────────────────────────────────────────────

export function PageHeader({ label, title, description, badge }: { label: string; title: string; description?: string; badge?: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-cyan-400/20 bg-[linear-gradient(135deg,rgba(8,20,34,.96),rgba(4,9,18,.92))] p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">{label}</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-white lg:text-3xl">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">{description}</p>}
        </div>
        {badge}
      </div>
    </section>
  )
}

// ── SectionCard ────────────────────────────────────────────────────────────────

export function SectionCard({ title, children, action }: { title?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5">
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-black text-white">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

// ── HealthIcon ─────────────────────────────────────────────────────────────────

export function HealthIcon({ status }: { status: string }) {
  if (status === 'healthy' || status === 'ready') return <CheckCircle2 className="h-4 w-4 text-emerald-400" />
  if (status === 'warning') return <AlertTriangle className="h-4 w-4 text-amber-400" />
  if (status === 'critical' || status === 'failed') return <AlertCircle className="h-4 w-4 text-red-400" />
  if (status === 'pending') return <Clock className="h-4 w-4 text-amber-400" />
  return <HelpCircle className="h-4 w-4 text-slate-500" />
}
