import type React from 'react'
import { AlertTriangle, CheckCircle2, CircleDashed, CircleSlash } from 'lucide-react'
import { getCapabilityRuntimeTruth, type CapabilityRuntimeTruthEntry } from '@/lib/capability-runtime-truth'
import { getProviderRuntimeTruth } from '@/lib/provider-runtime-truth'
import { CAPABILITY_UI_MODES } from '@/lib/capability-ui-schema'
import { getArtifactType, getCapabilityRoute } from '@/lib/capability-display'
import { CAPABILITY_STUDIOS } from '@/lib/dashboard-control-room'

export const dynamic = 'force-dynamic'

type UiStatus = 'Working' | 'Needs proof' | 'Blocked' | 'Missing'

const STATUS_LABELS: Record<CapabilityRuntimeTruthEntry['status'], UiStatus> = {
  working: 'Working',
  wired_unproven: 'Needs proof',
  blocked: 'Blocked',
  missing: 'Missing',
}

const STATUS_TONE: Record<UiStatus, string> = {
  Working: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
  'Needs proof': 'border-amber-300/20 bg-amber-300/10 text-amber-100',
  Blocked: 'border-red-300/20 bg-red-300/10 text-red-100',
  Missing: 'border-slate-600/50 bg-slate-800/80 text-slate-300',
}

// Derive required config and artifact/job types from schema where capability-runtime-truth doesn't expose them
function getSchemaMetadata(capabilityId: string) {
  const mode = CAPABILITY_UI_MODES.find((m) => m.requestCapability === capabilityId || m.statusCapabilityId === capabilityId || m.id === capabilityId)
  return {
    artifactType: mode?.artifactType ?? null,
    knownRoute: mode?.knownRoute ?? null,
    requiredConfig: mode?.proofRequirements?.join(', ') ?? null,
    jobType: mode?.artifactType === 'video' || mode?.id === 'long_form_video' ? 'async_job' : mode?.artifactType === 'audio' ? 'sync_or_async' : null,
  }
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
              Generated from canonical capability runtime truth. Route metadata alone never marks a capability as working.
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

      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="text-lg font-black text-white">Capability Studio map</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {CAPABILITY_STUDIOS.map((studio) => (
            <article key={studio.id} className="rounded-lg border border-slate-800 bg-slate-950/55 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-black text-slate-100">{studio.displayName}</p>
                <span className="shrink-0 rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-0.5 text-[10px] font-black text-amber-100">{studio.proofStatus}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{studio.purpose}</p>
              <p className="mt-2 font-mono text-[10px] leading-5 text-slate-600">{studio.capabilityIds.join(', ')}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-left text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
              <th className="bg-slate-950/80 px-3 py-2">Capability</th>
              <th className="bg-slate-950/80 px-3 py-2">Status</th>
              <th className="bg-slate-950/80 px-3 py-2">Proof</th>
              <th className="bg-slate-950/80 px-3 py-2">Connected providers</th>
              <th className="bg-slate-950/80 px-3 py-2">Required config</th>
              <th className="bg-slate-950/80 px-3 py-2">Artifact type</th>
              <th className="bg-slate-950/80 px-3 py-2">Job type</th>
              <th className="bg-slate-950/80 px-3 py-2">Route</th>
              <th className="bg-slate-950/80 px-3 py-2">Blocker</th>
              <th className="bg-slate-950/80 px-3 py-2">Next action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {capabilities.map((entry) => (
              <CapabilityRow key={entry.capabilityId} entry={entry} connectedProviderIds={connectedProviderIds} />
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}

function CapabilityRow({
  entry,
  connectedProviderIds,
}: {
  entry: CapabilityRuntimeTruthEntry
  connectedProviderIds: Set<string>
}) {
  const status = STATUS_LABELS[entry.status]
  const connected = entry.providerCandidates.filter((provider) => connectedProviderIds.has(provider))
  const meta = getSchemaMetadata(entry.capabilityId)

  return (
    <tr className="hover:bg-slate-900/40">
      <td className="bg-slate-950/55 px-3 py-3 font-black text-slate-100">
        {entry.label}
        <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-slate-600">{entry.category}</span>
      </td>
      <td className="bg-slate-950/55 px-3 py-3"><StatusPill status={status} /></td>
      <td className="bg-slate-950/55 px-3 py-3 font-semibold text-slate-400">{entry.proofStatus}</td>
      <td className="bg-slate-950/55 px-3 py-3 font-semibold text-slate-400">
        {entry.providerCandidates.length
          ? connected.length ? connected.join(', ') : 'None connected'
          : 'Platform storage'}
      </td>
      <td className="bg-slate-950/55 px-3 py-3 font-semibold text-slate-400">
        {meta.requiredConfig ?? (entry.hasRequiredKey ? 'Key required' : entry.hasRequiredEndpoint !== undefined && !entry.hasRequiredEndpoint ? 'Endpoint required' : 'Not specified')}
      </td>
      <td className="bg-slate-950/55 px-3 py-3 font-semibold text-slate-400">
        {getArtifactType(entry, meta)}
      </td>
      <td className="bg-slate-950/55 px-3 py-3 font-semibold text-slate-400">
        {meta.jobType ?? (entry.capabilityId.includes('video') || entry.capabilityId.includes('long_form') ? 'async_job' : 'sync')}
      </td>
      <td className="bg-slate-950/55 px-3 py-3 font-mono font-semibold text-slate-500">{getCapabilityRoute(entry, meta)}</td>
      <td className="max-w-xs bg-slate-950/55 px-3 py-3 font-semibold text-slate-400">{entry.blocker || 'None'}</td>
      <td className="max-w-xs bg-slate-950/55 px-3 py-3 font-semibold text-slate-400">{entry.nextAction || 'No action required'}</td>
    </tr>
  )
}

function StatusPill({ status }: { status: UiStatus }) {
  const Icon =
    status === 'Working' ? CheckCircle2 :
    status === 'Needs proof' ? CircleDashed :
    status === 'Blocked' ? AlertTriangle :
    CircleSlash
  return (
    <span className={['inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black', STATUS_TONE[status]].join(' ')}>
      <Icon className="h-3.5 w-3.5" />
      {status}
    </span>
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
