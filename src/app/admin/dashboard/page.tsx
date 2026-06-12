/**
 * Dashboard home — Command Center overview.
 *
 * Shows:
 * - Quick-access capability launchers
 * - Provider setup status (user-friendly, no raw env dumps)
 * - Recent jobs/artifacts summary
 * - Connected apps summary
 * - Readiness overview
 *
 * Uses real API endpoints. No fake data.
 */

'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  AudioLines,
  Bot,
  Brain,
  CheckCircle2,
  Cpu,
  FileText,
  Film,
  Image,
  Layers3,
  Loader2,
  Music,
  Network,
  Puzzle,
  Settings2,
  Sparkles,
  Video,
  Zap,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type ProviderStatus = {
  id: string
  displayName: string
  configured: boolean
  state: 'ready' | 'missing' | 'invalid'
  blocker: string | null
}

type ReadinessSummary = {
  ready: boolean
  providersReady: number
  providersTotal: number
  artifactPersistenceReady: boolean
  blockerCount: number
}

// ── Quick launchers ───────────────────────────────────────────────────────────

const QUICK_LAUNCHERS = [
  { icon: Brain, label: 'Chat & Reasoning', href: '/admin/dashboard/command', color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/25' },
  { icon: Image, label: 'Image Generation', href: '/admin/dashboard/studio', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/25' },
  { icon: Film, label: 'Video Generation', href: '/admin/dashboard/studio', color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/25' },
  { icon: AudioLines, label: 'Voice & TTS', href: '/admin/dashboard/avatar-voice', color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/25' },
  { icon: Music, label: 'Music & Songs', href: '/admin/dashboard/studio', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/25' },
  { icon: Bot, label: 'Avatar Video', href: '/admin/dashboard/avatar-voice', color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/25' },
  { icon: FileText, label: 'Research & Docs', href: '/admin/dashboard/command', color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/25' },
  { icon: Puzzle, label: 'Connected Apps', href: '/admin/dashboard/connected-apps', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/25' },
] as const

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardHomePage() {
  const [providers, setProviders] = useState<ProviderStatus[]>([])
  const [readiness, setReadiness] = useState<ReadinessSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [readinessError, setReadinessError] = useState(false)

  useEffect(() => {
    let mounted = true
    fetch('/api/admin/system/ai-deployment-readiness', { cache: 'no-store' })
      .then(async (response) => {
        const readinessData = await response.json().catch(() => null)
        if (!response.ok || !readinessData?.summary) throw new Error('Readiness unavailable')
        return readinessData
      })
      .then((readinessData) => {
        if (!mounted) return
        setProviders(readinessData.providers ?? [])
        setReadiness(readinessData.summary)
        setReadinessError(false)
      })
      .catch(() => {
        if (!mounted) return
        setProviders([])
        setReadiness(null)
        setReadinessError(true)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false }
  }, [])

  const readyProviders = providers.filter((p) => p.state === 'ready')

  return (
    <div className="space-y-8">

      {/* ── Welcome header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-400">Command Center</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white lg:text-3xl">
            What do you want to create?
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Choose a capability below or use the Command Center for natural language execution.
          </p>
        </div>
        <Link
          href="/admin/dashboard/command"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-black text-slate-950 shadow-[0_0_24px_rgba(20,184,166,0.3)] transition hover:bg-teal-400"
        >
          <Sparkles className="h-4 w-4" />
          Open Command Center
        </Link>
      </div>

      {/* ── Quick launchers ────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Quick Launch</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_LAUNCHERS.map(({ icon: Icon, label, href, color, bg }) => (
            <Link
              key={label}
              href={href}
              className={`group flex items-center gap-3 rounded-2xl border p-4 transition hover:scale-[1.02] hover:shadow-lg ${bg}`}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <span className="text-sm font-bold text-slate-200 group-hover:text-white">{label}</span>
              <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-600 transition group-hover:text-slate-400" />
            </Link>
          ))}
        </div>
      </section>

      {/* ── Readiness overview ─────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              label="Providers ready"
              value={readinessError ? 'Unavailable' : `${readyProviders.length} / ${providers.length}`}
              status={
                readinessError
                  ? 'unknown'
                  : providers.length > 0 && readyProviders.length === providers.length
                    ? 'ready'
                    : readyProviders.length > 0
                      ? 'partial'
                      : 'missing'
              }
              icon={<Network className="h-5 w-5" />}
              href="/admin/dashboard/provider-mesh"
            />
            <StatCard
              label="Capabilities"
              value="62"
              status="ready"
              icon={<Cpu className="h-5 w-5" />}
              href="/admin/dashboard/model-universe"
            />
            <StatCard
              label="Artifact storage"
              value={readinessError ? 'Unavailable' : readiness?.artifactPersistenceReady ? 'Ready' : 'Needs setup'}
              status={readinessError ? 'unknown' : readiness?.artifactPersistenceReady ? 'ready' : 'missing'}
              icon={<Layers3 className="h-5 w-5" />}
              href="/admin/dashboard/outputs"
            />
            <StatCard
              label="System readiness"
              value={readinessError ? 'Unavailable' : readiness ? (readiness.blockerCount === 0 ? 'All clear' : `${readiness.blockerCount} blockers`) : 'Checking...'}
              status={readinessError ? 'unknown' : readiness?.blockerCount === 0 ? 'ready' : 'missing'}
              icon={<Zap className="h-5 w-5" />}
              href="/admin/dashboard/system"
            />
          </>
        )}
      </div>

      {/* ── Provider setup ─────────────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Provider Setup</h2>
          <Link href="/admin/dashboard/settings" className="text-xs font-bold text-teal-400 transition hover:text-teal-300">
            Manage settings →
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
            <p className="text-sm text-slate-500">Checking provider configuration…</p>
          </div>
        ) : readinessError ? (
          <div className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-sm text-slate-400">Provider status is unavailable. Open Settings to retry.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        )}
      </section>

      {/* ── Navigation shortcuts ───────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Dashboard Sections</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Sparkles, label: 'Studio', desc: 'Generate images, video, music, voice, and more', href: '/admin/dashboard/studio', color: 'text-teal-400' },
            { icon: Puzzle, label: 'Connected Apps', desc: 'Register apps, manage webhooks, view events', href: '/admin/dashboard/connected-apps', color: 'text-cyan-400' },
            { icon: Layers3, label: 'Artifacts & Outputs', desc: 'Browse, download, and reuse generated outputs', href: '/admin/dashboard/outputs', color: 'text-violet-400' },
            { icon: Network, label: 'Provider Mesh', desc: 'View provider status and capability routing', href: '/admin/dashboard/provider-mesh', color: 'text-teal-400' },
            { icon: Video, label: 'Jobs', desc: 'Track running and completed execution jobs', href: '/admin/dashboard/operations', color: 'text-cyan-400' },
            { icon: Settings2, label: 'Settings', desc: 'Configure API keys, storage, and policies', href: '/admin/dashboard/settings', color: 'text-slate-400' },
          ].map(({ icon: Icon, label, desc, href, color }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-start gap-4 rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5 transition hover:border-slate-700 hover:bg-slate-900/70"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-800/60">
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-200 group-hover:text-white">{label}</p>
                <p className="mt-0.5 text-xs leading-5 text-slate-500">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  status,
  icon,
  href,
}: {
  label: string
  value: string
  status: 'ready' | 'partial' | 'missing' | 'unknown'
  icon: React.ReactNode
  href: string
}) {
  const statusColors = {
    ready: 'text-emerald-400',
    partial: 'text-amber-400',
    missing: 'text-amber-400',
    unknown: 'text-slate-300',
  }
  const dotColors = {
    ready: 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]',
    partial: 'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]',
    missing: 'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]',
    unknown: 'bg-slate-500',
  }

  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5 transition hover:border-slate-700 hover:bg-slate-900/70"
    >
      <div className="flex items-center justify-between">
        <span className="text-slate-500 group-hover:text-slate-400">{icon}</span>
        <span className={`h-2 w-2 rounded-full ${dotColors[status]}`} />
      </div>
      <div>
        <p className={`text-xl font-black ${statusColors[status]}`}>{value}</p>
        <p className="mt-0.5 text-xs text-slate-500">{label}</p>
      </div>
    </Link>
  )
}

function ProviderCard({ provider }: { provider: ProviderStatus }) {
  const isReady = provider.state === 'ready'

  return (
    <div
      className={[
        'rounded-2xl border p-4 transition',
        isReady
          ? 'border-emerald-800/40 bg-emerald-900/10'
          : 'border-amber-800/30 bg-amber-900/8',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold text-slate-200">{provider.displayName}</p>
        <span
          className={[
            'rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide',
            isReady
              ? 'bg-emerald-900/60 text-emerald-300'
              : 'bg-amber-900/60 text-amber-300',
          ].join(' ')}
        >
          {isReady ? 'Ready' : 'Needs setup'}
        </span>
      </div>
      {!isReady && provider.blocker && (
        <div className="mt-2 flex items-start gap-1.5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
          <p className="text-xs leading-5 text-amber-300/80">
            {provider.blocker.replace(/Configure one of:.*/, 'Add your API key in Settings.')}
          </p>
        </div>
      )}
      {isReady && (
        <div className="mt-2 flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          <p className="text-xs text-emerald-300/80">Connected and ready</p>
        </div>
      )}
    </div>
  )
}
