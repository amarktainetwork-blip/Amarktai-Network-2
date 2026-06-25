'use client'

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { listAssets, type AssetSummary } from '@/lib/dashboard-api'
import { EmptyState, ErrorState, LoadingState, PageHeader, SectionCard, StatusBadge } from '@/components/dashboard/ui'

export default function MarketingAssetsPage() {
  const [assets, setAssets] = useState<AssetSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    const result = await listAssets()
    if (result.ok && result.data) {
      setAssets(result.data)
    } else {
      setError(result.error ?? 'Failed to load assets')
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  return (
    <div className="space-y-5">
      <PageHeader
        label="Marketing / Assets"
        title="Campaign Assets"
        badge={
          <button onClick={load} className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        }
      />
      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} retry={load} />}
      {!loading && !error && (
        <SectionCard title={`Assets (${assets.length})`}>
          {assets.length === 0
            ? <EmptyState title="No assets yet" description="Assets appear after a marketing workflow runs." />
            : assets.map(a => (
                <div key={a.id} className="mb-2 rounded-xl border border-slate-700/40 bg-slate-950/45 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-200">{a.assetType}</p>
                      <p className="text-xs text-slate-400">{a.promptSummary}</p>
                    </div>
                    <StatusBadge status={a.approvalStatus} />
                  </div>
                </div>
              ))
          }
        </SectionCard>
      )}
    </div>
  )
}
