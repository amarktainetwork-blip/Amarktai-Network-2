/**
 * Provider Mesh page — visual routing dashboard.
 *
 * Shows the six approved providers with:
 * - Readiness status from live API
 * - Capability coverage per provider
 * - Visual routing explanation
 * - User-friendly setup actions
 *
 * No unapproved providers. No raw env dumps. No secrets.
 */

'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Network,
  RefreshCw,
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

// ── Provider capability coverage ──────────────────────────────────────────────

const PROVIDER_CAPABILITIES: Record<string, { groups: string[]; highlight: string; keyEnv: string }> = {
  genx: {
    groups: ['Text', 'Image', 'Video', 'Audio', 'Music', 'Avatar', 'TTS', 'STT'],
    highlight: 'Primary provider — broadest capability coverage',
    keyEnv: 'GENX_API_KEY',
  },
  huggingface: {
    groups: ['Text', 'Image', 'Audio', 'STT', 'Embeddings', 'Specialist models'],
    highlight: 'Specialist models — 44+ capability-specific routes',
    keyEnv: 'HUGGINGFACE_API_KEY',
  },
  qwen: {
    groups: ['Text', 'Image', 'Video', 'Audio', 'Embeddings', 'Async jobs'],
    highlight: 'Media generation — async video and image jobs',
    keyEnv: 'QWEN_API_KEY',
  },
  mimo: {
    groups: ['Text', 'Reasoning', 'Vision', 'Audio', 'TTS', 'STT', 'Web search'],
    highlight: 'Reasoning and web search — MiMo-7B-RL',
    keyEnv: 'MIMO_API_KEY',
  },
  groq: {
    groups: ['Text', 'Reasoning', 'STT', 'TTS'],
    highlight: 'Ultra-fast inference — lowest latency text and STT',
    keyEnv: 'GROQ_API_KEY',
  },
  together: {
    groups: ['Text', 'Image', 'Embeddings', 'Rerank', 'Open models'],
    highlight: 'Open model access — embeddings and rerank',
    keyEnv: 'TOGETHER_API_KEY',
  },
}

// ── Routing flow steps ────────────────────────────────────────────────────────

const ROUTING_STEPS = [
  { label: 'Request', desc: 'User or connected app sends a capability request' },
  { label: 'Capability engine', desc: 'Routes by capability type, not raw model name' },
  { label: 'Provider selection', desc: 'Picks the best configured provider with fallback' },
  { label: 'Job / execution', desc: 'Runs the task — sync or async depending on capability' },
  { label: 'Artifact / result', desc: 'Saves output, returns reference to caller' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProviderMeshPage() {
  const [providers, setProviders] = useState<ProviderStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/admin/system/ai-deployment-readiness')
      const data = await res.json()
      setProviders(data.providers ?? [])
    } catch {
      // silently fail
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  const readyCount = providers.filter((p) => p.state === 'ready').length

  return (
    <div className="space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-400">Provider Mesh</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white lg:text-3xl">
            Capability-First Routing
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            AmarktAI routes every request to the right provider by capability — not by raw model name.
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

      {/* ── Status summary ─────────────────────────────────────────────────── */}
      {!loading && (
        <div className="flex flex-wrap gap-3">
          <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${
            readyCount === providers.length
              ? 'border-emerald-800/40 bg-emerald-900/20 text-emerald-300'
              : 'border-amber-800/30 bg-amber-900/15 text-amber-300'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${
              readyCount === providers.length
                ? 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]'
                : 'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]'
            }`} />
            {readyCount} of {providers.length} providers ready
          </div>
        </div>
      )}

      {/* ── Routing flow ───────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">How Routing Works</h2>
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900/40 sm:flex-row">
          {ROUTING_STEPS.map((step, i) => (
            <div key={step.label} className="flex flex-1 flex-col gap-1 border-b border-slate-800/60 p-4 sm:border-b-0 sm:border-r last:border-0">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-[10px] font-black text-teal-400">
                  {i + 1}
                </span>
                <p className="text-xs font-black text-slate-200">{step.label}</p>
                {i < ROUTING_STEPS.length - 1 && (
                  <ArrowRight className="ml-auto hidden h-3.5 w-3.5 shrink-0 text-slate-600 sm:block" />
                )}
              </div>
              <p className="text-xs leading-5 text-slate-500">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Provider cards ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Approved Providers</h2>

        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
            <p className="text-sm text-slate-500">Checking provider status…</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {providers.map((provider) => {
              const info = PROVIDER_CAPABILITIES[provider.id]
              const isReady = provider.state === 'ready'

              return (
                <div
                  key={provider.id}
                  className={[
                    'rounded-2xl border p-5 transition',
                    isReady
                      ? 'border-emerald-800/40 bg-emerald-900/10'
                      : 'border-slate-800/60 bg-slate-900/40',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={[
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
                        isReady
                          ? 'border-emerald-700/40 bg-emerald-900/30'
                          : 'border-slate-700/60 bg-slate-800/60',
                      ].join(' ')}>
                        {isReady
                          ? <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                          : <Network className="h-5 w-5 text-slate-500" />
                        }
                      </div>
                      <div>
                        <p className="font-black text-slate-100">{provider.displayName}</p>
                        {info && <p className="text-xs text-slate-500">{info.highlight}</p>}
                      </div>
                    </div>
                    <span className={[
                      'shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide',
                      isReady
                        ? 'bg-emerald-900/60 text-emerald-300'
                        : 'bg-amber-900/60 text-amber-300',
                    ].join(' ')}>
                      {isReady ? 'Ready' : 'Needs setup'}
                    </span>
                  </div>

                  {info && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {info.groups.map((group) => (
                        <span key={group} className="rounded-full border border-slate-700/50 bg-slate-800/50 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                          {group}
                        </span>
                      ))}
                    </div>
                  )}

                  {!isReady && info && (
                    <div className="mt-4 rounded-xl border border-amber-800/30 bg-amber-900/10 p-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                        <p className="text-xs font-bold text-amber-200">Add your API key to activate this provider.</p>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <code className="rounded bg-slate-900/60 px-2 py-0.5 font-mono text-[11px] text-amber-300">
                          {info.keyEnv}
                        </code>
                        <Link href="/admin/dashboard/settings" className="flex items-center gap-1 text-xs font-bold text-amber-400 transition hover:text-amber-300">
                          Configure <ChevronRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  )}

                  {isReady && (
                    <p className="mt-3 text-xs text-emerald-300/70">
                      Connected and routing capabilities.
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Capability routing note ────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/30 p-5">
        <div className="flex items-start gap-3">
          <Zap className="mt-0.5 h-5 w-5 shrink-0 text-teal-400" />
          <div>
            <p className="font-bold text-slate-200">Automatic fallback routing</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              When a primary provider is unavailable or not configured, AmarktAI automatically routes to the next available provider that supports the requested capability. Configure multiple providers for maximum reliability.
            </p>
          </div>
        </div>
      </div>

      {/* ── Quick link ─────────────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <Link
          href="/admin/dashboard/settings"
          className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-black text-slate-950 transition hover:bg-teal-400"
        >
          Configure providers <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/admin/dashboard/model-universe"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-800/60 px-5 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-slate-800"
        >
          Browse capabilities
        </Link>
      </div>

    </div>
  )
}
