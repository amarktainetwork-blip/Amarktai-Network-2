'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { listCampaigns, type CampaignSummary } from '@/lib/dashboard-api'
import { EmptyState, ErrorState, LoadingState, PageHeader, SectionCard, StatusBadge } from '@/components/dashboard/ui'

export default function MarketingCampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    const result = await listCampaigns()
    if (result.ok && result.data) setCampaigns(result.data)
    else setError(result.error ?? 'Could not load campaigns')
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  return (
    <div className="space-y-5">
      <PageHeader
        label="Marketing / Campaigns"
        title="Campaigns"
        badge={
          <button onClick={load} className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        }
      />
      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} retry={load} />}
      {!loading && !error && (
        <SectionCard title={`Campaigns (${campaigns.length})`}>
          {campaigns.length === 0
            ? <EmptyState title="No campaigns yet" description="Run the Marketing Workflow to create a campaign." action={<Link href="/admin/dashboard/marketing" className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-black text-cyan-300">Go to Marketing</Link>} />
            : campaigns.map(c => (
                <div key={c.id} className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-slate-700/40 bg-slate-950/45 p-3">
                  <div>
                    <p className="font-black text-slate-200">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.goal}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))
          }
        </SectionCard>
      )}
    </div>
  )
}
