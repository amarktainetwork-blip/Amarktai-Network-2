'use client'

import { useEffect, useState } from 'react'

type CostSummary = {
  todaySpendUsd: number
  monthSpendUsd: number
  byApp: Record<string, number>
  byProvider: Record<string, number>
  byAgent: Record<string, number>
  recentExpensiveRuns: Array<{ id: string; provider: string; model: string; appSlug: string; agentId?: string; estimatedCostUsd: number; createdAt: string }>
  budgetWarnings: string[]
}

export default function CostsPage() {
  const [summary, setSummary] = useState<CostSummary | null>(null)

  useEffect(() => {
    fetch('/api/admin/costs')
      .then((response) => response.json())
      .then((data) => setSummary(data.summary ?? null))
      .catch(() => setSummary(null))
  }, [])

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Costs</p>
        <h1 className="mt-3 text-3xl font-black text-white">Cost control.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          Track estimated spend by provider, model, app, agent, and run so operators can choose cheap, balanced, or premium routes with budget awareness.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <Metric label="Today spend" value={`$${(summary?.todaySpendUsd ?? 0).toFixed(2)}`} />
        <Metric label="Month spend" value={`$${(summary?.monthSpendUsd ?? 0).toFixed(2)}`} />
        <Metric label="Tracked apps" value={String(Object.keys(summary?.byApp ?? {}).length)} />
        <Metric label="Warnings" value={String(summary?.budgetWarnings.length ?? 0)} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Breakdown title="Spend by app" values={summary?.byApp ?? {}} />
        <Breakdown title="Spend by provider" values={summary?.byProvider ?? {}} />
        <Breakdown title="Spend by agent" values={summary?.byAgent ?? {}} />
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-base font-bold text-white">Recent expensive runs</h2>
        <div className="mt-4 space-y-2">
          {(summary?.recentExpensiveRuns ?? []).map((run) => (
            <div key={run.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-400">
              ${run.estimatedCostUsd.toFixed(2)} - {run.appSlug} - {run.agentId ?? 'operator'} - {run.provider}/{run.model}
            </div>
          ))}
          {(!summary?.recentExpensiveRuns?.length) && <p className="text-sm text-slate-500">No tracked runs yet.</p>}
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-black text-white">{value}</p>
    </div>
  )
}

function Breakdown({ title, values }: { title: string; values: Record<string, number> }) {
  const rows = Object.entries(values)
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
      <h2 className="text-base font-bold text-white">{title}</h2>
      <div className="mt-4 space-y-2">
        {rows.map(([key, value]) => (
          <div key={key} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-400">{key}</span>
            <span className="font-semibold text-slate-200">${value.toFixed(2)}</span>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-slate-500">No spend recorded.</p>}
      </div>
    </div>
  )
}
