'use client'

import { useEffect, useState } from 'react'
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
  score: number
  status: 'excellent' | 'good' | 'degraded' | 'failing' | 'unknown'
  recommendation: string
  lastArtifactPath: string | null
}

export default function ProviderIntelligencePage() {
  const [rows, setRows] = useState<ProviderScoreSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [appSlug, setAppSlug] = useState('amarktai-network')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/provider-scores?appSlug=${encodeURIComponent(appSlug)}&days=14`)
      const data = await res.json()
      if (!res.ok || data.success === false) throw new Error(data.error ?? `HTTP ${res.status}`)
      setRows(data.summaries ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load provider scores')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const healthy = rows.filter((row) => row.status === 'excellent' || row.status === 'good').length
  const failing = rows.filter((row) => row.status === 'failing').length

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-[#0d1a2e] to-[#060d1b] p-6">
        <Link href="/admin/dashboard/ai-engine" className="mb-4 inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to AI Engine
        </Link>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Activity className="h-6 w-6 text-cyan-400" />
              <h1 className="text-2xl font-bold text-white">Provider Intelligence</h1>
            </div>
            <p className="max-w-3xl text-sm text-slate-400">
              Real routing memory from provider-result logs. Use this to see which provider/model/capability routes are fast, reliable, degraded, or failing.
            </p>
          </div>
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 hover:text-white disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-500">Routes logged</p>
          <p className="mt-1 text-2xl font-bold text-white">{rows.length}</p>
        </div>
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
          <p className="text-[11px] uppercase tracking-wider text-emerald-300/80">Healthy</p>
          <p className="mt-1 text-2xl font-bold text-emerald-200">{healthy}</p>
        </div>
        <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4">
          <p className="text-[11px] uppercase tracking-wider text-red-300/80">Failing</p>
          <p className="mt-1 text-2xl font-bold text-red-200">{failing}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-500">App</p>
          <input value={appSlug} onChange={(event) => setAppSlug(event.target.value)} onBlur={load} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white outline-none" />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-sm font-semibold text-white">Provider score table</p>
          <p className="text-xs text-slate-500">Score below 45 with enough samples should not be used as an automatic route.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Capability</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Success</th>
                <th className="px-4 py-3">Latency</th>
                <th className="px-4 py-3">Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.provider}-${row.model}-${row.capability}`} className="border-b border-white/[0.04] text-slate-300 hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] ${row.status === 'excellent' || row.status === 'good' ? 'bg-emerald-400/10 text-emerald-200' : row.status === 'degraded' ? 'bg-amber-400/10 text-amber-200' : 'bg-red-400/10 text-red-200'}`}>
                      {row.status === 'failing' ? <AlertTriangle className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-white">{row.provider}</td>
                  <td className="px-4 py-3 font-mono text-slate-400">{row.model}</td>
                  <td className="px-4 py-3">{row.capability}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-1"><Zap className="h-3 w-3 text-cyan-300" />{row.score}</span></td>
                  <td className="px-4 py-3">{Math.round(row.successRate * 100)}% ({row.success}/{row.total})</td>
                  <td className="px-4 py-3">{row.avgLatencyMs == null ? '—' : `${row.avgLatencyMs}ms`}</td>
                  <td className="px-4 py-3 text-slate-500">{row.recommendation}</td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">No provider result logs yet. Run provider capability tests or specialist routes first.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
