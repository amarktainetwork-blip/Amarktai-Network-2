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
  providerRoutes?: Array<{ provider: string; executable: boolean }>
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
  working: { label: 'Wired', color: 'bg-emerald-900/60 text-emerald-300' },
  partially_wired: { label: 'Partial', color: 'bg-amber-900/60 text-amber-300' },
  provider_available_not_wired: { label: 'Provider available', color: 'bg-slate-800 text-slate-400' },
  unavailable: { label: 'Unavailable', color: 'bg-red-900/60 text-red-300' },
}

export default function CapabilitiesPage() {
  const [capabilities, setCapabilities] = useState<CapabilityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/system/ai-capabilities-truth', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => {
        if (data?.error) throw new Error(data.error)
        setCapabilities(Array.isArray(data.capabilities) ? data.capabilities : [])
        setError('')
      })
      .catch((loadError) => {
        setCapabilities([])
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

  const totalWorking = capabilities.filter((c) => c.status === 'working').length
  const totalCapabilities = capabilities.length
  const totalPartial = capabilities.filter((c) => c.status === 'partially_wired').length
  const totalUnavailable = capabilities.filter((c) => c.status !== 'working' && c.status !== 'partially_wired').length

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        eyebrow="Capabilities"
        title="Runtime capability browser"
        description="Brain runtime truth grouped by capability family. Working, partial, and unavailable states stay explicit so the dashboard never overclaims execution readiness."
        actions={
          <Link
            href="/admin/dashboard/studio"
            className="inline-flex items-center gap-2 rounded-full bg-cyan-300 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-950 transition hover:bg-cyan-200"
          >
            Open Studio
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <DashboardMetricCard label="Wired" value={totalWorking} tone="emerald" detail="Capabilities with runtime adapters and a working route contract." />
        <DashboardMetricCard label="Partial" value={totalPartial} tone="amber" detail="Capabilities that are wired but still limited by inputs, setup, or incomplete adapter coverage." />
        <DashboardMetricCard label="Unavailable" value={totalUnavailable} tone="slate" detail="Capabilities that remain blocked or not wired yet." />
      </div>

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
            const workingInGroup = caps.filter((c) => c.status === 'working').length

            return (
              <DashboardSectionPanel
                key={groupKey}
                eyebrow={`${workingInGroup} of ${caps.length} wired`}
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
                        <DashboardStatusBadge value={STATUS_LABELS[cap.status]?.label ?? cap.status} map={{
                          Wired: { label: 'Wired', className: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-200' },
                          Partial: { label: 'Partial', className: 'border-amber-500/30 bg-amber-500/12 text-amber-200' },
                          'Provider available': { label: 'Provider available', className: 'border-slate-700/60 bg-slate-800/60 text-slate-300' },
                          Unavailable: { label: 'Unavailable', className: 'border-rose-500/25 bg-rose-500/12 text-rose-200' },
                        }} />
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-400">{cap.description}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
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
                        {cap.blocker || 'No declared blocker. Capability readiness still depends on runtime route truth and provider discovery.'}
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
