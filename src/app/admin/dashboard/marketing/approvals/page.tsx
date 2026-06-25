'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckSquare, RefreshCw } from 'lucide-react'
import { PageHeader, SectionCard, StatusBadge, LoadingState, ErrorState, EmptyState } from '@/components/dashboard/ui'
import { listAssets, approveAsset, rejectAsset, requestChanges, type AssetSummary } from '@/lib/dashboard-api'

export default function ApprovalsPage() {
  const [assets, setAssets] = useState<AssetSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await listAssets()
    if (!res.ok) {
      setError(res.error ?? 'Could not load approvals')
    } else {
      setAssets(res.data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const doAction = async (id: string, action: 'approve' | 'reject' | 'needs_changes') => {
    let notes = ''
    if (action === 'reject') {
      const input = window.prompt('Rejection reason:')
      if (input === null) return
      notes = input
    } else if (action === 'needs_changes') {
      const input = window.prompt('What needs to change?')
      if (input === null) return
      notes = input
    }
    setBusy((b) => ({ ...b, [id]: true }))
    if (action === 'approve') await approveAsset(id, notes)
    else if (action === 'reject') await rejectAsset(id, notes)
    else await requestChanges(id, notes)
    await load()
    setBusy((b) => ({ ...b, [id]: false }))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        label="AmarktAI"
        title="Approvals"
        description="Assets in manual_review mode must be approved before publishing. Unapproved assets are blocked from the publisher."
        badge={
          <button onClick={load} className="flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-800/60 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        }
      />

      {loading && <LoadingState label="Loading pending approvals…" />}
      {!loading && error && <ErrorState message={error} retry={load} />}
      {!loading && !error && assets.length === 0 && (
        <EmptyState
          icon={<CheckSquare className="h-8 w-8" />}
          title="No pending approvals"
          description="All assets have been reviewed. New pending items will appear here."
        />
      )}
      {!loading && !error && assets.length > 0 && (
        <div className="space-y-3">
          {assets.map((a) => (
            <SectionCard key={a.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-black text-white">{a.promptSummary || a.assetType}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{a.capability} · {a.id.slice(0, 12)}…</p>
                </div>
                <StatusBadge status={a.approvalStatus} />
              </div>
              {a.resultUrl && (
                <a href={a.resultUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-bold text-sky-400 hover:text-sky-300">
                  Preview asset →
                </a>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => doAction(a.id, 'approve')} disabled={busy[a.id]} className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-xs font-black text-emerald-300 hover:bg-emerald-400/15 disabled:opacity-50">
                  ✓ Approve
                </button>
                <button onClick={() => doAction(a.id, 'needs_changes')} disabled={busy[a.id]} className="rounded-lg border border-amber-400/25 bg-amber-400/10 px-4 py-2 text-xs font-black text-amber-300 hover:bg-amber-400/15 disabled:opacity-50">
                  ↩ Needs Changes
                </button>
                <button onClick={() => doAction(a.id, 'reject')} disabled={busy[a.id]} className="rounded-lg border border-red-400/25 bg-red-400/10 px-4 py-2 text-xs font-black text-red-300 hover:bg-red-400/15 disabled:opacity-50">
                  ✗ Reject
                </button>
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  )
}
