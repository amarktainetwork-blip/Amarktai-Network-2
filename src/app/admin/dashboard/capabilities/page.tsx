import type React from 'react'
import { AlertTriangle, CheckCircle2, CircleDashed, CircleSlash, Route } from 'lucide-react'
import { getCapabilityRuntimeTruth, type CapabilityRuntimeTruthEntry } from '@/lib/capability-runtime-truth'
import { getProviderRuntimeTruth } from '@/lib/provider-runtime-truth'

export const dynamic = 'force-dynamic'

type UiStatus = 'Working' | 'Wired, needs proof' | 'Blocked' | 'Missing'

const STATUS_LABELS: Record<CapabilityRuntimeTruthEntry['status'], UiStatus> = {
  working: 'Working',
  wired_unproven: 'Wired, needs proof',
  blocked: 'Blocked',
  missing: 'Missing',
}

const STATUS_TONE: Record<UiStatus, string> = {
  Working: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
  'Wired, needs proof': 'border-amber-300/20 bg-amber-300/10 text-amber-100',
  Blocked: 'border-red-300/20 bg-red-300/10 text-red-100',
  Missing: 'border-slate-600/50 bg-slate-800/80 text-slate-300',
}

export default async function CapabilitiesPage() {
  const [capabilities, providers] = await Promise.all([
    getCapabilityRuntimeTruth(),
    getProviderRuntimeTruth(),
  ])
  const summary = {
    working: capabilities.filter((entry) => entry.status === 'working').length,
    wired: capabilities.filter((entry) => entry.status === 'wired_unproven').length,
    blocked: capabilities.filter((entry) => entry.status === 'blocked').length,
    missing: capabilities.filter((entry) => entry.status === 'missing').length,
  }
  const connectedProviderIds = new Set(providers.filter((provider) => provider.connected).map((provider) => provider.providerId))

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-cyan-300/15 bg-[#071019] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Capabilities</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white">Runtime capability truth</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
              This page is generated from the canonical capability runtime truth. Route metadata alone never marks a capability as working.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <Summary label="Working" value={summary.working} />
            <Summary label="Needs proof" value={summary.wired} />
            <Summary label="Blocked" value={summary.blocked} />
            <Summary label="Missing" value={summary.missing} />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/60">
        <div className="grid grid-cols-[1.1fr_0.85fr_0.9fr_0.8fr_1fr_1fr] gap-px bg-slate-800/70 text-xs">
          {['Capability', 'Status', 'Providers', 'Route', 'Proof', 'Required fix'].map((heading) => (
            <div key={heading} className="bg-slate-950/80 px-3 py-2 font-black uppercase tracking-[0.12em] text-slate-500">{heading}</div>
          ))}
          {capabilities.map((entry) => (
            <CapabilityLine key={entry.capabilityId} entry={entry} connectedProviderIds={connectedProviderIds} />
          ))}
        </div>
      </section>
    </div>
  )
}

function CapabilityLine({
  entry,
  connectedProviderIds,
}: {
  entry: CapabilityRuntimeTruthEntry
  connectedProviderIds: Set<string>
}) {
  const status = STATUS_LABELS[entry.status]
  const connected = entry.providerCandidates.filter((provider) => connectedProviderIds.has(provider))
  return (
    <>
      <Cell strong icon={<Route />}>
        <span className="block">{entry.label}</span>
        <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-slate-600">{entry.category}</span>
      </Cell>
      <Cell><StatusPill status={status} /></Cell>
      <Cell>{entry.providerCandidates.length ? connected.length ? connected.join(', ') : entry.providerCandidates.join(', ') : 'Platform storage'}</Cell>
      <Cell>{entry.hasExecutionRoute ? 'Wired' : 'Missing'}</Cell>
      <Cell>{proofLabel(entry)}</Cell>
      <Cell>{entry.blocker || entry.nextAction || 'No action required'}</Cell>
    </>
  )
}

function proofLabel(entry: CapabilityRuntimeTruthEntry) {
  if (entry.proofStatus === 'passed') return 'Live proof passed'
  if (entry.proofStatus === 'failed') return 'Live proof failed'
  if (entry.proofStatus === 'route_only') return 'Execution route exists; proof still needed'
  return 'Live proof not run'
}

function StatusPill({ status }: { status: UiStatus }) {
  const Icon =
    status === 'Working' ? CheckCircle2 :
    status === 'Wired, needs proof' ? CircleDashed :
    status === 'Blocked' ? AlertTriangle :
    CircleSlash
  return (
    <span className={['inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black', STATUS_TONE[status]].join(' ')}>
      <Icon className="h-3.5 w-3.5" />
      {status}
    </span>
  )
}

function Cell({ children, strong = false, icon }: { children: React.ReactNode; strong?: boolean; icon?: React.ReactElement }) {
  return (
    <div className={['min-h-16 bg-slate-950/55 px-3 py-3 text-xs leading-5', strong ? 'font-black text-slate-100' : 'font-semibold text-slate-400'].join(' ')}>
      <span className="flex items-start gap-2">
        {icon && <span className="mt-0.5 text-cyan-300 [&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>}
        <span>{children}</span>
      </span>
    </div>
  )
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/65 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  )
}
