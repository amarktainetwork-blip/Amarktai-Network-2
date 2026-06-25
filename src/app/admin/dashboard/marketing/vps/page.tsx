'use client'

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { PageHeader, SectionCard, StatusBadge, LoadingState, ErrorState } from '@/components/dashboard/ui'
import { getVpsReadiness, type VpsReadinessResult, type VpsCheck } from '@/lib/dashboard-api'

export default function VpsHealthPage() {
  const [data, setData] = useState<VpsReadinessResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await getVpsReadiness()
    if (!res.ok || !res.data) {
      setError(res.error ?? 'Could not load VPS readiness')
    } else {
      setData(res.data)
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading) return <LoadingState label="Checking VPS readiness…" />
  if (error || !data) return <ErrorState message={error ?? 'No data returned'} retry={load} />

  return (
    <div className="space-y-6">
      <PageHeader
        label="Infrastructure"
        title="VPS Health"
        description={`Checked at ${new Date(data.checkedAt).toLocaleString()}`}
        badge={
          <button onClick={load} className="flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-800/60 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        }
      />

      {/* Overall status */}
      <SectionCard>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Overall</p>
            <p className="mt-1 font-black text-white">{data.summary}</p>
          </div>
          <StatusBadge status={data.status} label={data.status.toUpperCase()} />
        </div>
        {data.upgradeRecommended && (
          <p className="mt-3 text-sm font-bold text-amber-300">
            Upgrade recommended: {data.upgradeReasons.join('; ')}
          </p>
        )}
      </SectionCard>

      {data.blockingIssues.length > 0 && (
        <div className="rounded-2xl border border-red-400/20 bg-red-400/8 p-5">
          <p className="text-xs font-black uppercase tracking-wide text-red-300">Blocking Issues</p>
          <ul className="mt-3 space-y-1.5">
            {data.blockingIssues.map((issue) => <li key={issue} className="text-sm text-red-200">{issue}</li>)}
          </ul>
        </div>
      )}

      {data.warningIssues.length > 0 && (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/8 p-5">
          <p className="text-xs font-black uppercase tracking-wide text-amber-300">Warnings</p>
          <ul className="mt-3 space-y-1.5">
            {data.warningIssues.map((issue) => <li key={issue} className="text-sm text-amber-200">{issue}</li>)}
          </ul>
        </div>
      )}

      <SectionCard title="System Checks">
        <div className="grid gap-3 sm:grid-cols-2">
          {data.checks.map((check) => <CheckCard key={check.name} check={check} />)}
        </div>
      </SectionCard>

      {data.alerts.length > 0 && (
        <SectionCard title="Active Alerts">
          <ul className="space-y-1.5">
            {data.alerts.map((alert) => <li key={alert} className="text-sm text-slate-300">{alert}</li>)}
          </ul>
        </SectionCard>
      )}
    </div>
  )
}

function CheckCard({ check }: { check: VpsCheck }) {
  const borderColor = { healthy: 'border-emerald-400/20', warning: 'border-amber-400/20', critical: 'border-red-400/20', unknown: 'border-slate-700/40' }[check.status]
  return (
    <div className={`rounded-2xl border ${borderColor} bg-slate-900/60 p-4`}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-bold text-slate-200">{check.name}</p>
        <StatusBadge status={check.status} />
      </div>
      <p className="mt-1.5 text-sm text-slate-400">{check.message}</p>
      {check.value !== null && (
        <p className="mt-1 text-xs text-slate-500">
          Value: <span className="font-mono text-slate-300">{String(check.value)}</span>
          {check.threshold?.warning !== undefined && <> · warn {check.threshold.warning}</>}
          {check.threshold?.critical !== undefined && <> · crit {check.threshold.critical}</>}
        </p>
      )}
    </div>
  )
}
