'use client'

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Server } from 'lucide-react'
import { getVpsReadiness, type VpsReadinessResult } from '@/lib/dashboard-api'
import { ErrorState, HealthIcon, LoadingState, PageHeader, SectionCard, StatCard, StatusBadge } from '@/components/dashboard/ui'

export default function VpsHealthPage() {
  const [data, setData] = useState<VpsReadinessResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    const result = await getVpsReadiness()
    if (result.ok && result.data) {
      setData(result.data)
    } else {
      setError(result.error ?? 'Failed to load VPS readiness')
    }
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const refresh = () => { setRefreshing(true); void load() }

  return (
    <div className="space-y-5">
      <PageHeader
        label="VPS Health"
        title="Production Readiness"
        description="Real-time status of every system component. No fake green — only live probe results."
        badge={
          <div className="flex items-center gap-3">
            {data && <StatusBadge status={data.status} />}
            <button
              onClick={refresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        }
      />

      {loading && <LoadingState label="Running readiness checks…" />}
      {!loading && error && <ErrorState message={error} retry={refresh} />}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Overall Status" value={data.status.toUpperCase()} icon={<Server />} />
            <StatCard label="Blocking Issues" value={data.blockingIssues.length} sub={data.blockingIssues.length === 0 ? 'None' : 'See below'} />
            <StatCard label="Warnings" value={data.warningIssues.length} />
            <StatCard label="Upgrade Recommended" value={data.upgradeRecommended ? 'Yes' : 'No'} />
          </div>

          {data.alerts.length > 0 && (
            <SectionCard title="Active Alerts">
              <ul className="space-y-2">
                {data.alerts.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-amber-200">
                    <span className="mt-0.5 text-amber-400">⚠</span>
                    {a}
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {data.upgradeReasons.length > 0 && (
            <SectionCard title="Upgrade Reasons">
              <ul className="space-y-1 text-sm text-slate-300">
                {data.upgradeReasons.map((r, i) => <li key={i} className="flex items-start gap-2"><span className="text-cyan-400">→</span>{r}</li>)}
              </ul>
            </SectionCard>
          )}

          <SectionCard title="Component Checks">
            <div className="space-y-2">
              {data.checks.map((check) => (
                <div key={check.name} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-700/40 bg-slate-950/45 p-3">
                  <div className="flex items-center gap-2.5">
                    <HealthIcon status={check.status} />
                    <div>
                      <p className="text-sm font-bold text-slate-200">{check.name}</p>
                      <p className="text-xs text-slate-400">{check.message}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={check.status} />
                    {check.value !== null && (
                      <p className="text-[10px] text-slate-500">
                        {String(check.value)}
                        {check.threshold?.warning !== undefined && ` (warn >${check.threshold.warning}`}
                        {check.threshold?.critical !== undefined && `, crit >${check.threshold.critical})`}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-600">{check.durationMs}ms</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </>
      )}
    </div>
  )
}
