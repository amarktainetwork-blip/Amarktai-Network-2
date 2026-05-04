'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Activity, AlertTriangle, ArrowLeft, RefreshCw, ShieldCheck, Zap } from 'lucide-react'

interface ProviderScoreSummary {
  appSlug: string
  provider: string
  model: string
  capability: string
  total: number
  success: number
  failed: number
  successRate: number
  avgLatencyMs: number | null
  p95LatencyMs: number | null
  lastSuccessAt: string | null
  lastFailureAt: string | null
  lastArtifactPath: string | null
  score: number
  status: 'excellent' | 'good' | 'degraded' | 'failing' | 'unknown'
  recommendation: string
}

const statusClass: Record<string, string> = {
  excellent: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
  good: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200',
  degraded: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
  failing: 'border-red-400/20 bg-red-400/10 text-red-200',
  unknown: 'border-slate-400/20 bg-slate-400/10 text-slate-200',
}

export default function ProviderIntelligencePage() {
  const [scores, setScores] = useState<ProviderScoreSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [appSlug, setAppSlug] = useState('amarktai-network')
  const [provider, setProvider] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const qs = new URLSearchParams({ appSlug, days: '14' })
      if (provider.trim()) qs.set('provider', provider.trim())
      const res = await fetch(`/api/admin/provider-scores?${qs.toString()}`)
      const data = await res.json()
      if (!res.ok || data.success === false) throw new Error(data.error ?? 'Failed to load provider scores')
      setScores(data.summaries ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load provider scores')
    } finally {
      setLoading(false)
    }
  }, [appSlug, provider])

  useEffect(() => { load() }, [load])

  const totals = scores.reduce((acc, score) => {
    acc.total += score.total
    acc.failed += score.failed
    acc.success += score.success
    return acc
  }, { total: 0, success: 0, failed: 0 })

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-[#0d1a2e] to-[#060d1b] p-6">
        <Link href="/admin/dashboard/ai-engine" className="mb-4 inline-flex items-center gap-2 text-xs text-slate-500 hover:text-cyan-300"><ArrowLeft className="h-3.5 w-3.5" /> AI Engine</Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-cyan-300" />
              <h1 className="text-2xl font-bold text-white">Provider Intelligence</h1>
            </div>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">Scores are built from real provider-result logs: success rate, failures, latency and artifacts. Use this to decide which providers AmarktAI Assistant and apps should trust.</p>
          </div>
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 hover:text-white disabled:opacity-40"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-[11px] uppercase tracking-wider text-slate-500">Total tests</p><p className="mt-1 text-xl font-bold text-white">{totals.total}</p></div>
        <div className="rounded-xl border border-emerald-400/10 bg-emerald-400/[0.03] p-4"><p className="text-[11px] uppercase tracking-wider text-slate-500">Successes</p><p className="mt-1 text-xl font-bold text-emerald-200">{totals.success}</p></div>
        <div className="rounded-xl border border-red-400/10 bg-red-400/[0.03] p-4"><p className="text-[11px] uppercase tracking-wider text-slate-500">Failures</p><p className="mt-1 text-xl font-bold text-red-200">{totals.failed}</p></div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input value={appSlug} onChange={(e) => setAppSlug(e.target.value)} placeholder="appSlug" className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none" />
          <input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="provider filter, optional" className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none" />
          <button onClick={load} className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100">Apply</button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>}

      <div className="space-y-3">
        {scores.length === 0 && !loading && <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-slate-500">No provider-result logs yet. Run capability or specialist tests first.</div>}
        {scores.map((score) => (
          <div key={`${score.provider}:${score.model}:${score.capability}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClass[score.status]}`}>{score.status}</span>
                  <p className="text-sm font-bold text-white">{score.provider} / {score.model}</p>
                </div>
                <p className="mt-1 text-xs text-slate-500">{score.capability} · {score.recommendation}</p>
                {score.lastArtifactPath && <a href={score.lastArtifactPath} target="_blank" className="mt-2 inline-flex text-xs text-cyan-300 hover:underline">Open latest artifact</a>}
              </div>
              <div className="grid grid-cols-2 gap-2 text-right text-xs sm:grid-cols-5">
                <Metric label="Score" value={`${score.score}`} icon={<ShieldCheck className="h-3.5 w-3.5" />} />
                <Metric label="Success" value={`${Math.round(score.successRate * 100)}%`} />
                <Metric label="Total" value={`${score.total}`} />
                <Metric label="Avg" value={score.avgLatencyMs == null ? '—' : `${score.avgLatencyMs}ms`} icon={<Zap className="h-3.5 w-3.5" />} />
                <Metric label="Failed" value={`${score.failed}`} icon={score.failed ? <AlertTriangle className="h-3.5 w-3.5" /> : undefined} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Metric({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2"><p className="flex items-center justify-end gap-1 text-[10px] uppercase tracking-wider text-slate-600">{icon}{label}</p><p className="mt-1 font-semibold text-white">{value}</p></div>
}
