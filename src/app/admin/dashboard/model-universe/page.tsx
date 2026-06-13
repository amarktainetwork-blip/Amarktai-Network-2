/**
 * Capabilities / Model Universe page — capability-first browser.
 *
 * NOT a raw model marketplace.
 * Shows capability families grouped by type.
 * Uses the canonical AI_CAPABILITY_TAXONOMY — no duplicate registry.
 */

import Link from 'next/link'
import { AI_CAPABILITY_TAXONOMY } from '@/lib/ai-capability-taxonomy'
import {
  AudioLines,
  Bot,
  Brain,
  CheckCircle2,
  Cpu,
  FileText,
  Image,
  Layers3,
  Music,
  Puzzle,
  Video,
  XCircle,
} from 'lucide-react'

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
  working: { label: 'Working', color: 'bg-emerald-900/60 text-emerald-300' },
  partially_wired: { label: 'Partial', color: 'bg-amber-900/60 text-amber-300' },
  provider_available_not_wired: { label: 'Provider available', color: 'bg-slate-800 text-slate-400' },
  unavailable: { label: 'Unavailable', color: 'bg-red-900/60 text-red-300' },
}

export default function ModelUniversePage() {
  // Group capabilities by their group
  const grouped = AI_CAPABILITY_TAXONOMY.reduce<Record<string, typeof AI_CAPABILITY_TAXONOMY[number][]>>(
    (acc, cap) => {
      if (!acc[cap.group]) acc[cap.group] = []
      acc[cap.group].push(cap)
      return acc
    },
    {},
  )

  const totalWorking = AI_CAPABILITY_TAXONOMY.filter((c) => c.status === 'working').length
  const totalCapabilities = AI_CAPABILITY_TAXONOMY.length

  return (
    <div className="space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-400">Capabilities</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-white lg:text-3xl">
          AI Capability Browser
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {totalWorking} of {totalCapabilities} capabilities are working. Browse by family below.
        </p>
      </div>

      {/* ── Summary strip ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-full border border-emerald-800/40 bg-emerald-900/20 px-3 py-1.5 text-xs font-bold text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {totalWorking} working
        </div>
        <div className="flex items-center gap-2 rounded-full border border-amber-800/30 bg-amber-900/15 px-3 py-1.5 text-xs font-bold text-amber-300">
          {totalCapabilities - totalWorking} need provider setup or wiring
        </div>
      </div>

      {/* ── Capability groups ──────────────────────────────────────────────── */}
      <div className="space-y-6">
        {Object.entries(GROUP_CONFIG).map(([groupKey, groupInfo]) => {
          const caps = grouped[groupKey] ?? []
          if (caps.length === 0) return null
          const Icon = groupInfo.icon
          const workingInGroup = caps.filter((c) => c.status === 'working').length

          return (
            <section key={groupKey}>
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-800/60">
                  <Icon className={`h-4 w-4 ${groupInfo.color}`} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-200">{groupInfo.label}</h2>
                  <p className="text-xs text-slate-500">{workingInGroup} of {caps.length} working</p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {caps.map((cap) => {
                  const statusInfo = STATUS_LABELS[cap.status] ?? STATUS_LABELS.unavailable
                  const isWorking = cap.status === 'working'

                  return (
                    <div
                      key={cap.id}
                      className={[
                        'rounded-xl border p-4 transition',
                        isWorking
                          ? 'border-slate-800/60 bg-slate-900/40 hover:border-teal-500/30 hover:bg-teal-500/5'
                          : 'border-slate-800/40 bg-slate-900/20 opacity-70',
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-slate-200">{cap.label}</p>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      <p className="mt-1 text-xs leading-5 text-slate-500 line-clamp-2">{cap.description}</p>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {/* Output types */}
                        <div className="flex flex-wrap gap-1">
                          {cap.outputTypes.slice(0, 3).map((type) => (
                            <span key={type} className="rounded bg-slate-800/60 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                              {type}
                            </span>
                          ))}
                        </div>

                        {/* Artifact indicator */}
                        {cap.createsArtifact && (
                          <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-teal-400">
                            <Layers3 className="h-3 w-3" />
                            artifact
                          </span>
                        )}
                      </div>

                      {/* Provider routes */}
                      {isWorking && cap.providerRoutes.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {cap.providerRoutes.slice(0, 4).map((route) => (
                            <span key={route.provider} className="rounded-full border border-teal-500/20 bg-teal-500/8 px-2 py-0.5 text-[10px] font-bold text-teal-400">
                              {route.provider}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Blocker */}
                      {cap.blocker && (
                        <div className="mt-2 flex items-start gap-1.5">
                          <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-slate-600" />
                          <p className="text-[10px] leading-4 text-slate-600 line-clamp-2">{cap.blocker}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      {/* ── Quick links ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/dashboard/studio"
          className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-black text-slate-950 transition hover:bg-teal-400"
        >
          Open Studio to create
        </Link>
        <Link
          href="/admin/dashboard/provider-mesh"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-800/60 px-5 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-slate-800"
        >
          View provider mesh
        </Link>
      </div>

    </div>
  )
}
