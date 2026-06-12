/**
 * System / Readiness page — user-friendly operational status.
 *
 * Shows:
 * - Overall readiness status
 * - Provider configuration status
 * - Artifact storage status
 * - Capability engine overview
 * - Blockers in plain language
 *
 * No stack traces. No backend file names. No test wording.
 * No raw env dumps. Plain language only.
 */

'use client'

import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Layers3,
  Loader2,
  Network,
  RefreshCw,
  Shield,
  XCircle,
  Zap,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type ProviderStatus = {
  id: string
  displayName: string
  state: 'ready' | 'missing' | 'invalid'
  configured: boolean
  blocker: string | null
}

type ArtifactStatus = {
  ready: boolean
  storage: { configured: boolean; writable: boolean; readable: boolean }
  database: { configured: boolean; writable: boolean; error: string | null }
}

type ReadinessData = {
  version: string
  generatedAt: string
  ready: boolean
  summary: {
    capabilities: number
    providersReady: number
    providersTotal: number
    hfSpecialistRoutesReady: number
    hfSpecialistRoutesTotal: number
    connectedAppsReady: number
    connectedAppsTotal: number
    artifactPersistenceReady: boolean
    blockerCount: number
  }
  providers: ProviderStatus[]
  artifacts: ArtifactStatus
  blockers: string[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SystemPage() {
  const [data, setData] = useState<ReadinessData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const load = async () => {
    setRefreshing(true)
    setLoadError(false)
    try {
      const res = await fetch('/api/admin/system/ai-deployment-readiness', { cache: 'no-store' })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.summary) throw new Error('Readiness unavailable')
      setData(json)
    } catch {
      setData(null)
      setLoadError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  const isReady = data?.ready ?? false
  const blockers = data?.blockers ?? []
  const providers = data?.providers ?? []
  const summary = data?.summary

  return (
    <div className="space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-400">System</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white lg:text-3xl">
            Platform Readiness
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Live status of your AI capability engine, providers, and infrastructure.
          </p>
        </div>
        <button
          onClick={load}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-800/60 px-4 py-2 text-xs font-bold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Overall status banner ──────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
          <p className="text-sm text-slate-500">Checking platform readiness…</p>
        </div>
      ) : loadError ? (
        <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800/60">
              <AlertTriangle className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <p className="text-lg font-black text-slate-200">Readiness status unavailable</p>
              <p className="text-sm text-slate-400">Refresh the page or sign in again to check live platform status.</p>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={[
            'rounded-2xl border p-6',
            isReady
              ? 'border-emerald-800/40 bg-emerald-900/10'
              : 'border-amber-800/30 bg-amber-900/8',
          ].join(' ')}
        >
          <div className="flex items-center gap-4">
            <div
              className={[
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border',
                isReady
                  ? 'border-emerald-700/40 bg-emerald-900/30'
                  : 'border-amber-700/30 bg-amber-900/20',
              ].join(' ')}
            >
              {isReady
                ? <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                : <AlertTriangle className="h-6 w-6 text-amber-400" />
              }
            </div>
            <div>
              <p className={`text-lg font-black ${isReady ? 'text-emerald-300' : 'text-amber-300'}`}>
                {isReady ? 'Platform is ready' : `${blockers.length} item${blockers.length === 1 ? '' : 's'} need attention`}
              </p>
              <p className="text-sm text-slate-400">
                {isReady
                  ? 'All providers, storage, and capabilities are configured.'
                  : 'Complete the setup items below to activate all capabilities.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Summary cards ──────────────────────────────────────────────────── */}
      {!loading && summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            icon={<Network className="h-5 w-5" />}
            label="Providers"
            value={`${summary.providersReady} / ${summary.providersTotal}`}
            status={summary.providersReady === summary.providersTotal ? 'ready' : summary.providersReady > 0 ? 'partial' : 'missing'}
          />
          <SummaryCard
            icon={<Cpu className="h-5 w-5" />}
            label="AI Capabilities"
            value={String(summary.capabilities)}
            status="ready"
          />
          <SummaryCard
            icon={<Layers3 className="h-5 w-5" />}
            label="Artifact Storage"
            value={summary.artifactPersistenceReady ? 'Ready' : 'Needs setup'}
            status={summary.artifactPersistenceReady ? 'ready' : 'missing'}
          />
          <SummaryCard
            icon={<Zap className="h-5 w-5" />}
            label="Blockers"
            value={summary.blockerCount === 0 ? 'None' : String(summary.blockerCount)}
            status={summary.blockerCount === 0 ? 'ready' : 'missing'}
          />
        </div>
      )}

      {/* ── Blockers ───────────────────────────────────────────────────────── */}
      {!loading && blockers.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-slate-400">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Setup Required
          </h2>
          <div className="space-y-2">
            {blockers.map((blocker, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl border border-amber-800/30 bg-amber-900/10 px-4 py-3"
              >
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <p className="text-sm text-amber-200">
                  {sanitizeBlocker(blocker)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Provider status ────────────────────────────────────────────────── */}
      {!loading && providers.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-slate-400">
            <Network className="h-4 w-4" />
            Provider Status
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className={[
                  'rounded-2xl border p-4',
                  provider.state === 'ready'
                    ? 'border-emerald-800/40 bg-emerald-900/10'
                    : 'border-amber-800/30 bg-amber-900/8',
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-slate-200">{provider.displayName}</p>
                  <StatusBadge state={provider.state} />
                </div>
                {provider.state !== 'ready' && (
                  <p className="mt-2 text-xs text-amber-300/70">
                    Add your API key in Settings to activate.
                  </p>
                )}
                {provider.state === 'ready' && (
                  <p className="mt-2 text-xs text-emerald-300/70">Connected and routing capabilities.</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Artifact storage ───────────────────────────────────────────────── */}
      {!loading && data?.artifacts && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-slate-400">
            <Layers3 className="h-4 w-4" />
            Artifact Storage
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <StorageRow
              label="File storage"
              ready={data.artifacts.storage.writable && data.artifacts.storage.readable}
              detail={data.artifacts.storage.writable ? 'Writable and readable' : 'Not configured or not writable'}
            />
            <StorageRow
              label="Database"
              ready={data.artifacts.database.writable}
              detail={data.artifacts.database.writable ? 'Connected and writable' : 'Not configured or not reachable'}
            />
          </div>
        </section>
      )}

      {/* ── Security note ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/30 p-5">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
          <div>
            <p className="font-bold text-slate-300">Security note</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              API keys and signing secrets are never shown in this interface. Provider keys are stored securely server-side. Connected-app signing secrets are stored as hashes only.
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Convert technical blocker messages to user-friendly language.
 */
function sanitizeBlocker(blocker: string): string {
  return blocker
    .replace(/Configure one of:.*/, 'Add your API key in Settings.')
    .replace(/process\.env\.\w+/g, 'your environment configuration')
    .replace(/\benv\b/gi, 'configuration')
    .replace(/\bENV\b/g, 'configuration')
    .slice(0, 200)
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({
  icon,
  label,
  value,
  status,
}: {
  icon: React.ReactNode
  label: string
  value: string
  status: 'ready' | 'partial' | 'missing'
}) {
  const valueColors = { ready: 'text-emerald-400', partial: 'text-amber-400', missing: 'text-amber-400' }
  const dotColors = {
    ready: 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]',
    partial: 'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]',
    missing: 'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]',
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5">
      <div className="flex items-center justify-between">
        <span className="text-slate-500">{icon}</span>
        <span className={`h-2 w-2 rounded-full ${dotColors[status]}`} />
      </div>
      <div>
        <p className={`text-xl font-black ${valueColors[status]}`}>{value}</p>
        <p className="mt-0.5 text-xs text-slate-500">{label}</p>
      </div>
    </div>
  )
}

function StatusBadge({ state }: { state: 'ready' | 'missing' | 'invalid' }) {
  const styles = {
    ready: 'bg-emerald-900/60 text-emerald-300',
    missing: 'bg-amber-900/60 text-amber-300',
    invalid: 'bg-red-900/60 text-red-300',
  }
  const labels = { ready: 'Ready', missing: 'Needs setup', invalid: 'Action required' }

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${styles[state]}`}>
      {labels[state]}
    </span>
  )
}

function StorageRow({ label, ready, detail }: { label: string; ready: boolean; detail: string }) {
  return (
    <div
      className={[
        'flex items-center justify-between gap-3 rounded-xl border p-4',
        ready ? 'border-emerald-800/40 bg-emerald-900/10' : 'border-amber-800/30 bg-amber-900/8',
      ].join(' ')}
    >
      <div>
        <p className="text-sm font-bold text-slate-200">{label}</p>
        <p className="text-xs text-slate-500">{detail}</p>
      </div>
      {ready
        ? <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-400" />
        : <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-amber-400" />
      }
    </div>
  )
}
