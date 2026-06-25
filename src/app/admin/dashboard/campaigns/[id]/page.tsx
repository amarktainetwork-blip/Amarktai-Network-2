'use client'

import Link from 'next/link'
import { use, useCallback, useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { getCampaign, type AssetSummary } from '@/lib/dashboard-api'
import { ErrorState, LoadingState, PageHeader, SectionCard, StatusBadge } from '@/components/dashboard/ui'

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<{ campaign: Record<string, unknown>; items: unknown[]; assets: AssetSummary[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    const result = await getCampaign(id)
    if (result.ok && result.data) {
      setData(result.data)
    } else {
      setError(result.error ?? 'Failed to load campaign')
    }
    setLoading(false)
  }, [id])

  useEffect(() => { void load() }, [load])

  return (
    <div className="space-y-5">
      <Link href="/admin/dashboard/campaigns" className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Campaigns
      </Link>

      <PageHeader label="Campaign" title={String(data?.campaign?.name ?? 'Campaign Detail')} />

      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} retry={load} />}

      {data && (
        <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
          <SectionCard title="Campaign Items">
            {(data.items as unknown[]).length === 0
              ? <p className="text-sm text-slate-500">No campaign items yet.</p>
              : (data.items as Array<Record<string, unknown>>).map((item) => (
                  <div key={String(item.id)} className="rounded-xl border border-slate-700/40 bg-slate-950/45 p-3 mb-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-slate-200">{String(item.title || item.platform)}</p>
                      <StatusBadge status={String(item.approvalStatus ?? item.status ?? 'draft')} />
                    </div>
                    {Boolean(item.caption) && <p className="mt-1 text-xs text-slate-400 line-clamp-2">{String(item.caption)}</p>}
                  </div>
                ))
            }
          </SectionCard>

          <div className="space-y-4">
            <SectionCard title="Details">
              <dl className="space-y-2 text-xs">
                <Row label="Status" value={String(data.campaign.status ?? '')} badge />
                <Row label="Goal" value={String(data.campaign.goal ?? '')} />
                <Row label="Platforms" value={(data.campaign.platforms as string[] | null)?.join(', ') ?? ''} />
                <Row label="Budget" value={String(data.campaign.budgetTier ?? '')} />
                <Row label="Quality" value={String(data.campaign.qualityTier ?? '')} />
                <Row label="Approval" value={String(data.campaign.approvalMode ?? '')} />
              </dl>
            </SectionCard>

            <SectionCard title="Assets">
              <p className="text-xs text-slate-500">{data.assets.length} asset(s)</p>
              <Link href="/admin/dashboard/assets" className="mt-2 inline-block text-xs font-bold text-cyan-400 hover:text-cyan-300">
                View all assets →
              </Link>
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, badge }: { label: string; value: string; badge?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-bold text-slate-300">
        {badge && value ? <StatusBadge status={value} /> : value || '—'}
      </dd>
    </div>
  )
}
