'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCw, TrendingUp } from 'lucide-react'
import { EmptyState, ErrorState, LoadingState, PageHeader, SectionCard } from '@/components/dashboard/ui'

type AnalyticMetric = 'impressions' | 'reach' | 'views' | 'likes' | 'comments' | 'shares' | 'saves' | 'clicks' | 'ctr' | 'watch_time' | 'completion_rate' | 'engagement_rate' | 'followers_gained' | 'conversions' | 'revenue' | 'cost' | 'manual_score'

const ALL_METRICS: AnalyticMetric[] = ['impressions', 'reach', 'views', 'likes', 'comments', 'shares', 'saves', 'clicks', 'ctr', 'watch_time', 'completion_rate', 'engagement_rate', 'conversions', 'revenue', 'cost', 'manual_score']

interface AnalyticsRow {
  id?: string
  campaignId: string | null
  assetId: string | null
  platform: string
  metric: string
  value: number
  recordedAt?: string
}

interface CampaignSummary {
  totals: Record<string, number>
  averages: Record<string, number>
  bestPlatform?: string
  topAsset?: string
}

export default function AnalyticsPage() {
  const [rows, setRows] = useState<AnalyticsRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<CampaignSummary | null>(null)

  const [campaignId, setCampaignId] = useState('')
  const [form, setForm] = useState({
    metric: 'impressions' as AnalyticMetric,
    value: '',
    platform: 'instagram',
    campaignId: '',
    assetId: '',
  })
  const [ingesting, setIngesting] = useState(false)
  const [ingestMsg, setIngestMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const url = campaignId
        ? `/api/admin/analytics?appSlug=dashboard&campaignId=${encodeURIComponent(campaignId)}`
        : '/api/admin/analytics?appSlug=dashboard'
      const res = await fetch(url, { cache: 'no-store' })
      const data = await res.json() as { analytics?: AnalyticsRow[]; summary?: CampaignSummary; error?: string }
      setRows(data.analytics ?? [])
      setSummary(data.summary ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => { void load() }, [load])

  async function ingest() {
    if (!form.value || isNaN(Number(form.value))) { setIngestMsg('Value must be a number'); return }
    setIngesting(true)
    setIngestMsg(null)
    try {
      const res = await fetch('/api/admin/analytics/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appSlug: 'dashboard',
          metric: form.metric,
          value: Number(form.value),
          platform: form.platform,
          campaignId: form.campaignId || undefined,
          assetId: form.assetId || undefined,
        }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setIngestMsg('Analytics ingested successfully')
      setForm(f => ({ ...f, value: '' }))
      await load()
    } catch (e) {
      setIngestMsg(e instanceof Error ? e.message : 'Failed')
    } finally {
      setIngesting(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        label="Analytics"
        title="Campaign Analytics"
        description="Track engagement metrics and campaign performance. Ingest metrics from external platforms or view aggregated results."
        badge={
          <button onClick={load} className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {/* Campaign summary */}
          {summary && (
            <SectionCard title="Campaign Summary">
              <div className="grid gap-3 sm:grid-cols-3">
                {Object.entries(summary.totals ?? {}).slice(0, 6).map(([metric, val]) => (
                  <div key={metric} className="rounded-xl border border-slate-700/30 bg-slate-950/30 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{metric}</p>
                    <p className="mt-1 text-xl font-black text-white">{typeof val === 'number' ? val.toLocaleString() : String(val)}</p>
                  </div>
                ))}
              </div>
              {summary.bestPlatform && <p className="mt-3 text-xs text-slate-400">Best platform: <span className="font-bold text-cyan-300">{summary.bestPlatform}</span></p>}
            </SectionCard>
          )}

          {/* Filter by campaign */}
          <SectionCard title="Filter">
            <div className="flex gap-2">
              <input
                type="text"
                value={campaignId}
                onChange={e => setCampaignId(e.target.value)}
                placeholder="Campaign ID (leave blank for all)"
                className="flex-1 rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-300 placeholder-slate-600 outline-none focus:border-cyan-500/40"
              />
              <button onClick={load} className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-400 hover:text-slate-200">Apply</button>
            </div>
          </SectionCard>

          {loading && <LoadingState label="Loading analytics…" />}
          {!loading && error && <ErrorState message={error} retry={load} />}

          {!loading && !error && (
            <SectionCard title={`Records (${rows.length})`}>
              {rows.length === 0 ? (
                <EmptyState
                  icon={<TrendingUp className="h-10 w-10" />}
                  title="No analytics yet"
                  description="Ingest metrics from the form or run published campaigns to populate analytics."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="pb-2 pr-3">Platform</th>
                        <th className="pb-2 pr-3">Metric</th>
                        <th className="pb-2 pr-3">Value</th>
                        <th className="pb-2">Campaign</th>
                      </tr>
                    </thead>
                    <tbody className="space-y-1">
                      {rows.slice(0, 50).map((r, i) => (
                        <tr key={i} className="border-t border-slate-800/50 text-slate-300">
                          <td className="py-1.5 pr-3">{r.platform}</td>
                          <td className="py-1.5 pr-3 font-bold">{r.metric}</td>
                          <td className="py-1.5 pr-3">{typeof r.value === 'number' ? r.value.toLocaleString() : String(r.value)}</td>
                          <td className="py-1.5 text-slate-500 truncate max-w-24">{r.campaignId?.slice(0, 10) ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          )}
        </div>

        {/* Ingest form */}
        <SectionCard title="Ingest Metric">
          <div className="space-y-3">
            <p className="text-xs text-slate-400">Manually ingest analytics data from external platforms.</p>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Metric</label>
              <select value={form.metric} onChange={e => setForm(f => ({ ...f, metric: e.target.value as AnalyticMetric }))} className="mt-1 w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-300 outline-none focus:border-cyan-500/40">
                {ALL_METRICS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Value</label>
              <input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-300 outline-none focus:border-cyan-500/40" placeholder="0" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Platform</label>
              <input type="text" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-300 outline-none focus:border-cyan-500/40" placeholder="instagram" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Campaign ID (optional)</label>
              <input type="text" value={form.campaignId} onChange={e => setForm(f => ({ ...f, campaignId: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-300 outline-none focus:border-cyan-500/40" placeholder="cmp_…" />
            </div>
            {ingestMsg && <p className={`text-xs ${ingestMsg.includes('successfully') ? 'text-emerald-300' : 'text-red-300'}`}>{ingestMsg}</p>}
            <button onClick={ingest} disabled={ingesting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50">
              {ingesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
              {ingesting ? 'Ingesting…' : 'Ingest Metric'}
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
