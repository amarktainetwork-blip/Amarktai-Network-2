type Status = 'healthy' | 'warning' | 'critical' | 'unknown' | 'configured' | 'not_configured' | 'approved' | 'rejected' | 'pending' | 'needs_changes' | 'published' | 'failed' | 'draft' | 'active' | 'ready' | 'processing' | string

const STYLES: Record<string, string> = {
  healthy: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  configured: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  approved: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  published: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  active: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  ready: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  warning: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
  pending: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
  needs_changes: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
  draft: 'border-slate-500/30 bg-slate-800/50 text-slate-400',
  processing: 'border-sky-400/25 bg-sky-400/10 text-sky-300',
  critical: 'border-red-400/25 bg-red-400/10 text-red-300',
  rejected: 'border-red-400/25 bg-red-400/10 text-red-300',
  failed: 'border-red-400/25 bg-red-400/10 text-red-300',
  not_configured: 'border-slate-600/30 bg-slate-800/40 text-slate-500',
  unknown: 'border-slate-600/30 bg-slate-800/40 text-slate-500',
}

export function StatusBadge({ status, label }: { status: Status; label?: string }) {
  const cls = STYLES[status] ?? 'border-slate-600/30 bg-slate-800/40 text-slate-400'
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${cls}`}>
      {label ?? status.replace(/_/g, ' ')}
    </span>
  )
}
