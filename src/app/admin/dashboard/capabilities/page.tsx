/**
 * Capabilities / Model Universe page — capability-first browser.
 *
 * NOT a raw model marketplace.
 * Shows capability families grouped by type.
 * Uses the canonical AI_CAPABILITY_TAXONOMY — no duplicate registry.
 */

'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  AudioLines,
  Bot,
  Brain,
  Cpu,
  FileText,
  Image,
  Layers3,
  Music,
  Puzzle,
  Video,
} from 'lucide-react'
import {
  DashboardEmptyState,
  DashboardMetricCard,
  DashboardPageHeader,
  DashboardSectionPanel,
  DashboardStatusBadge,
} from '@/components/dashboard/DashboardChrome'

type CapabilityEntry = {
  id: string
  label: string
  group: string
  description: string
  outputTypes: string[]
  createsArtifact: boolean
  blocker: string | null
  status: string
  backendStatus?: string
  proofStatus?: 'LIVE_PROVEN' | 'SOURCE_WIRED' | 'PROVIDER_AVAILABLE' | 'BLOCKED' | 'NOT_WIRED'
  routeAdapterExists?: boolean
  providerAvailable?: boolean
  providerCatalogWorks?: boolean
  providerLiveTestPassed?: boolean
  providerSmokePassed?: boolean
  modelExecutionPassed?: boolean
  capabilityRoutePassed?: boolean
  artifactPersisted?: boolean
  previewDownloadAvailable?: boolean
  capabilityLiveProven?: boolean
  exactProofError?: string | null
  providerRoutes?: Array<{ provider: string; executable: boolean }>
}

type CapabilityTruthResponse = {
  capabilities?: CapabilityEntry[]
  proofSummary?: {
    liveProven?: number
    sourceWired?: number
    providerAvailable?: number
    blocked?: number
    notWired?: number
  }
  catalogProofSummary?: {
    liveProven?: number
    sourceWired?: number
    providerAvailable?: number
    blocked?: number
    notWired?: number
  }
  proofGeneratedAt?: string | null
  error?: string
}

// ── Capability group display config ───────────────────────────────────────────

const GROUP_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  text: { label: 'Text & NLP', icon: Brain, color: 'text-teal-400' },
  multimodal: { label: 'Multimodal', icon: Layers3, color: 'text-cyan-400' },
  computer_vision: { label: 'Image & Vision', icon: Image, color: 'text-violet-400' },
  video: { label: 'Video', icon: Video, color: 'text-teal-400' },
  audio: { label: 'Audio & Voice', icon: AudioLines, color: 'text-cyan-400' },
  music: { label: 'Music', icon: Music, color: 'text-violet-400' },
  avatar_voice: { label: 'Avatar & Voice Clone', icon: Bot, color: 'text-teal-400' },
  tabular: { label: 'Data & Forecasting', icon: Cpu, color: 'text-cyan-400' },
  agents_or_planning: { label: 'Agents & Planning', icon: Puzzle, color: 'text-violet-400' },
  experimental: { label: 'Experimental', icon: FileText, color: 'text-slate-400' },
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  LIVE_PROVEN: { label: 'Live proven', color: 'bg-emerald-900/60 text-emerald-300' },
  SOURCE_WIRED: { label: 'Source wired', color: 'bg-cyan-900/50 text-cyan-300' },
  PROVIDER_AVAILABLE: { label: 'Provider available', color: 'bg-slate-800 text-slate-300' },
  BLOCKED: { label: 'Blocked', color: 'bg-amber-900/60 text-amber-300' },
  NOT_WIRED: { label: 'Not wired', color: 'bg-red-900/60 text-red-300' },
}

export default function CapabilitiesPage() {
  const [capabilities, setCapabilities] = useState<CapabilityEntry[]>([])
  const [proofSummary, setProofSummary] = useState<CapabilityTruthResponse['proofSummary'] | null>(null)
  const [catalogProofSummary, setCatalogProofSummary] = useState<CapabilityTruthResponse['catalogProofSummary'] | null>(null)
  const [proofGeneratedAt, setProofGeneratedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/system/ai-capabilities-truth', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data: CapabilityTruthResponse) => {
        if (data?.error) throw new Error(data.error)
        setCapabilities(Array.isArray(data.capabilities) ? data.capabilities : [])
        setProofSummary(data.proofSummary ?? null)
        setCatalogProofSummary(data.catalogProofSummary ?? null)
        setProofGeneratedAt(data.proofGeneratedAt ?? null)
        setError('')
      })
      .catch((loadError) => {
        setCapabilities([])
        setProofSummary(null)
        setCatalogProofSummary(null)
        setProofGeneratedAt(null)
        setError(loadError instanceof Error ? loadError.message : 'Capability runtime truth is unavailable.')
      })
      .finally(() => setLoading(false))
  }, [])

  // Group capabilities by their group
  const grouped = useMemo(() => capabilities.reduce<Record<string, CapabilityEntry[]>>(
    (acc, cap) => {
      if (!acc[cap.group]) acc[cap.group] = []
      acc[cap.group].push(cap)
      return acc
    },
    {},
  ), [capabilities])

  const proofStatus = (capability: CapabilityEntry) => capability.proofStatus ?? capability.status
  const totalLiveProven = proofSummary?.liveProven ?? capabilities.filter((c) => proofStatus(c) === 'LIVE_PROVEN').length
  const totalSourceWired = proofSummary?.sourceWired ?? capabilities.filter((c) => proofStatus(c) === 'SOURCE_WIRED').length
  const totalProviderAvailable = proofSummary?.providerAvailable ?? capabilities.filter((c) => proofStatus(c) === 'PROVIDER_AVAILABLE').length
  const totalBlocked = proofSummary?.blocked ?? capabilities.filter((c) => proofStatus(c) === 'BLOCKED').length
  const totalNotWired = proofSummary?.notWired ?? capabilities.filter((c) => proofStatus(c) === 'NOT_WIRED').length
  const totalCapabilities = capabilities.length
  const catalogLiveProven = catalogProofSummary?.liveProven ?? capabilities.filter((c) => proofStatus(c) === 'LIVE_PROVEN').length

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        eyebrow="Capabilities"
        title="Runtime capability browser"
        description="Brain runtime truth grouped by capability family. The top counters are the V1 proof run; the catalog cards below show the broader capability browser without overclaiming live execution."
        actions={
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/dashboard/provider-matrix"
              className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-400/15"
            >
              Provider Matrix
            </Link>
            <Link
              href="/admin/dashboard/studio"
              className="inline-flex items-center gap-2 rounded-full bg-cyan-300 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-950 transition hover:bg-cyan-200"
            >
              Open Studio
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <DashboardMetricCard label="V1 LIVE_PROVEN" value={totalLiveProven} tone="emerald" detail="Count from V1_25_CAPABILITY_PROOF.json, not the larger catalog browser." />
        <DashboardMetricCard label="V1 SOURCE_WIRED" value={totalSourceWired} tone="cyan" detail="Route and adapter source exist, but live execution proof is absent." />
        <DashboardMetricCard label="V1 PROVIDER_AVAILABLE" value={totalProviderAvailable} tone="slate" detail="Provider/catalog evidence exists, but the product route is not wired." />
        <DashboardMetricCard label="V1 BLOCKED" value={totalBlocked} tone="amber" detail="Blocked by configuration, policy, input, or runtime dependency." />
        <DashboardMetricCard label="V1 NOT_WIRED" value={totalNotWired} tone="slate" detail="No executable route mapping or adapter contract is present." />
      </div>
      {proofGeneratedAt ? (
        <p className="-mt-4 text-xs font-semibold text-slate-500">
          Proof file read: {new Date(proofGeneratedAt).toLocaleString()} · Catalog browser: {catalogLiveProven} of {totalCapabilities} taxonomy capabilities live-proven.
        </p>
      ) : null}

      {loading ? (
        <DashboardEmptyState title="Loading capability truth" detail="Reading canonical Brain capability and route-matrix truth." />
      ) : error ? (
        <DashboardEmptyState title="Capability truth unavailable" detail={error} />
      ) : totalCapabilities === 0 ? (
        <DashboardEmptyState title="No capabilities returned" detail="The runtime truth endpoint did not return any capability entries." />
      ) : (
        <div className="space-y-6">
          {Object.entries(GROUP_CONFIG).map(([groupKey, groupInfo]) => {
            const caps = grouped[groupKey] ?? []
            if (caps.length === 0) return null
            const Icon = groupInfo.icon
            const liveInGroup = caps.filter((c) => proofStatus(c) === 'LIVE_PROVEN').length

            return (
              <DashboardSectionPanel
                key={groupKey}
                eyebrow={`${liveInGroup} of ${caps.length} live-proven`}
                title={groupInfo.label}
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700/60 bg-slate-800/70">
                    <Icon className={`h-5 w-5 ${groupInfo.color}`} />
                  </div>
                  <p className="text-sm leading-6 text-slate-400">Capability family grouped from canonical Brain/runtime truth. Live provider availability may still vary by discovery and configuration.</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {caps.map((cap) => (
                    <article key={cap.id} className="rounded-[1.35rem] border border-slate-800/70 bg-slate-950/45 p-4 transition hover:border-cyan-400/20 hover:bg-cyan-400/[0.04]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-100">{cap.label}</p>
                          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{cap.id}</p>
                        </div>
                        <DashboardStatusBadge value={STATUS_LABELS[proofStatus(cap)]?.label ?? proofStatus(cap)} map={{
                          'Live proven': { label: 'Live proven', className: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-200' },
                          'Source wired': { label: 'Source wired', className: 'border-cyan-500/30 bg-cyan-500/12 text-cyan-200' },
                          'Provider available': { label: 'Provider available', className: 'border-slate-700/60 bg-slate-800/60 text-slate-300' },
                          Blocked: { label: 'Blocked', className: 'border-amber-500/30 bg-amber-500/12 text-amber-200' },
                          'Not wired': { label: 'Not wired', className: 'border-rose-500/25 bg-rose-500/12 text-rose-200' },
                        }} />
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-400">{cap.description}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <EvidenceChip label="Key/catalog" active={cap.providerCatalogWorks === true} />
                        <EvidenceChip label="Provider live test" active={cap.providerLiveTestPassed === true} />
                        <EvidenceChip label="Provider smoke" active={cap.providerSmokePassed === true} />
                        <EvidenceChip label="Model execution" active={cap.modelExecutionPassed === true} />
                        <EvidenceChip label="Route/adapter" active={cap.routeAdapterExists === true} />
                        <EvidenceChip label="Capability route" active={cap.capabilityRoutePassed === true} />
                        <EvidenceChip label="Capability live proof" active={cap.capabilityLiveProven === true} />
                        <EvidenceChip label="Artifact persisted" active={cap.artifactPersisted === true} applicable={cap.createsArtifact} />
                        <EvidenceChip label="Preview/download" active={cap.previewDownloadAvailable === true} applicable={cap.createsArtifact} />
                        {cap.outputTypes.slice(0, 4).map((type) => (
                          <span key={type} className="rounded-full border border-slate-700/60 bg-slate-900/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                            {type}
                          </span>
                        ))}
                        {cap.createsArtifact ? (
                          <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-300">
                            Artifact
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-4 text-xs leading-5 text-slate-500">
                        {cap.exactProofError || cap.blocker || 'No declared blocker. Capability readiness still depends on runtime route truth and provider discovery.'}
                      </p>
                    </article>
                  ))}
                </div>
              </DashboardSectionPanel>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EvidenceChip({ label, active, applicable = true }: { label: string; active: boolean; applicable?: boolean }) {
  if (!applicable) {
    return (
      <span className="rounded-full border border-slate-700/60 bg-slate-900/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}: n/a
      </span>
    )
  }
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
      active
        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
        : 'border-slate-700/60 bg-slate-900/70 text-slate-500'
    }`}>
      {label}: {active ? 'yes' : 'no'}
    </span>
  )
}
