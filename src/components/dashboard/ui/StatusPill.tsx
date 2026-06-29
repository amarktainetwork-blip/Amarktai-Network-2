export type PillVariant = 'working' | 'wired_unproven' | 'blocked' | 'missing' | 'not_configured' | 'installed' | 'proven' | 'failed' | 'planned'

const PILL_STYLES: Record<PillVariant, string> = {
  working:        'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  wired_unproven: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  blocked:        'border-red-400/30 bg-red-400/10 text-red-300',
  missing:        'border-slate-600/50 bg-slate-800/50 text-slate-500',
  not_configured: 'border-slate-600/50 bg-slate-800/50 text-slate-500',
  installed:      'border-blue-400/30 bg-blue-400/10 text-blue-300',
  proven:         'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  failed:         'border-red-400/30 bg-red-400/10 text-red-300',
  planned:        'border-slate-700/50 bg-slate-900/50 text-slate-600',
}

const PILL_LABELS: Record<PillVariant, string> = {
  working:        'Working',
  wired_unproven: 'Needs proof',
  blocked:        'Blocked',
  missing:        'Missing',
  not_configured: 'Not configured',
  installed:      'Installed',
  proven:         'Proven',
  failed:         'Failed',
  planned:        'Planned',
}

export function StatusPill({ status, label }: { status: PillVariant; label?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${PILL_STYLES[status]}`}>
      {label ?? PILL_LABELS[status]}
    </span>
  )
}
