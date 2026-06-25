'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Clock, RefreshCw, XCircle } from 'lucide-react'
import { approveAsset, listPendingApprovals, rejectAsset, requestChanges, type ApprovalTarget } from '@/lib/dashboard-api'
import { EmptyState, ErrorState, LoadingState, PageHeader, SectionCard, StatusBadge } from '@/components/dashboard/ui'

export default function ApprovalsPage() {
  const [items, setItems] = useState<ApprovalTarget[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setError(null)
    const result = await listPendingApprovals()
    if (result.ok && result.data) {
      setItems(result.data)
    } else {
      setError(result.error ?? 'Failed to load approvals')
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  async function decide(id: string, decision: 'approve' | 'reject' | 'needs_changes') {
    setBusy(id)
    const notes = noteInputs[id] ?? ''
    if (decision === 'approve') await approveAsset(id, notes)
    else if (decision === 'reject') await rejectAsset(id, notes || 'Rejected by reviewer')
    else await requestChanges(id, notes || 'Changes requested by reviewer')
    setBusy(null)
    await load()
  }

  const pending = items.filter(i => i.approvalStatus === 'pending_review' || i.approvalStatus === 'draft')
  const reviewed = items.filter(i => !['pending_review', 'draft'].includes(i.approvalStatus))

  return (
    <div className="space-y-5">
      <PageHeader
        label="Approvals"
        title="Approval Queue"
        description="Review and approve generated assets before they can be published. Publishing is blocked until approval is granted."
        badge={
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs font-bold text-amber-300">
              {pending.length} pending
            </div>
            <button onClick={load} className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
        }
      />

      {loading && <LoadingState label="Loading approvals…" />}
      {!loading && error && <ErrorState message={error} retry={load} />}

      {!loading && !error && (
        <>
          <SectionCard title={`Pending Review (${pending.length})`}>
            {pending.length === 0 ? (
              <EmptyState
                icon={<Clock className="h-10 w-10" />}
                title="No items pending review"
                description="All items have been reviewed. Publishing will unlock for approved assets."
              />
            ) : (
              <div className="space-y-3">
                {pending.map(item => (
                  <ApprovalCard
                    key={item.id}
                    item={item}
                    busy={busy === item.id}
                    note={noteInputs[item.id] ?? ''}
                    onNoteChange={v => setNoteInputs(n => ({ ...n, [item.id]: v }))}
                    onDecide={d => decide(item.id, d)}
                  />
                ))}
              </div>
            )}
          </SectionCard>

          {reviewed.length > 0 && (
            <SectionCard title={`Recently Reviewed (${reviewed.length})`}>
              <div className="space-y-2">
                {reviewed.map(item => (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700/40 bg-slate-950/45 p-3">
                    <div>
                      <p className="text-sm font-bold text-slate-300">{item.title ?? item.assetType ?? item.type}</p>
                      {item.approvalNotes && <p className="text-xs text-slate-500 italic">{item.approvalNotes}</p>}
                    </div>
                    <StatusBadge status={item.approvalStatus} />
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </>
      )}
    </div>
  )
}

function ApprovalCard({
  item, busy, note, onNoteChange, onDecide,
}: {
  item: ApprovalTarget
  busy: boolean
  note: string
  onNoteChange: (v: string) => void
  onDecide: (d: 'approve' | 'reject' | 'needs_changes') => void
}) {
  // Publishing is blocked for anything not approved
  const publishBlocked = item.approvalStatus !== 'approved'

  return (
    <div className="rounded-xl border border-slate-700/40 bg-slate-950/45 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-black text-slate-200">{item.title ?? item.assetType ?? item.type}</p>
          {item.platform && <p className="text-xs text-slate-500">Platform: {item.platform}</p>}
          {item.resultUrl && (
            <a href={item.resultUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-bold text-cyan-400 hover:text-cyan-300">
              Preview →
            </a>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={item.approvalStatus} />
          {publishBlocked && <span className="text-[10px] font-bold text-red-400">Publishing blocked</span>}
        </div>
      </div>

      <div className="mt-3">
        <input
          type="text"
          value={note}
          onChange={e => onNoteChange(e.target.value)}
          placeholder="Notes (optional for approve, required for reject/changes)"
          className="w-full rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-cyan-500/40"
          disabled={busy}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => onDecide('approve')}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Approve
        </button>
        <button
          onClick={() => onDecide('needs_changes')}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-black text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
        >
          Needs Changes
        </button>
        <button
          onClick={() => onDecide('reject')}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-black text-red-300 hover:bg-red-500/20 disabled:opacity-50"
        >
          <XCircle className="h-3.5 w-3.5" /> Reject
        </button>
      </div>
    </div>
  )
}
