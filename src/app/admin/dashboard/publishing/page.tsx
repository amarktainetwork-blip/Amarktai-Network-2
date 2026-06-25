'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Copy, Loader2, RefreshCw, Send } from 'lucide-react'
import { EmptyState, ErrorState, LoadingState, PageHeader, SectionCard, StatusBadge } from '@/components/dashboard/ui'

type PublishStatus = 'not_ready' | 'approval_required' | 'export_ready' | 'published' | 'failed' | 'provider_not_configured' | 'cancelled'

interface PublishingResult {
  id: string
  campaignId: string | null
  campaignItemId: string | null
  platform: string
  status: PublishStatus
  externalPostId: string | null
  externalPostUrl: string | null
  exportPackageId: string | null
  error: string | null
  publishedAt: string | null
  createdAt: string
}

const STATUS_DISPLAY: Record<PublishStatus, string> = {
  not_ready: 'not ready',
  approval_required: 'approval required',
  export_ready: 'export ready',
  published: 'published',
  failed: 'failed',
  provider_not_configured: 'provider not configured',
  cancelled: 'cancelled',
}

const STATUS_LEVEL: Record<PublishStatus, string> = {
  not_ready: 'unknown',
  approval_required: 'warning',
  export_ready: 'pending',
  published: 'healthy',
  failed: 'critical',
  provider_not_configured: 'warning',
  cancelled: 'unknown',
}

export default function PublishingPage() {
  const [results, setResults] = useState<PublishingResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/admin/publishing?appSlug=dashboard', { cache: 'no-store' })
      const data = await res.json() as { results?: PublishingResult[]; error?: string }
      setResults(data.results ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load publishing results')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function retryPublish(id: string) {
    setBusy(id)
    try {
      await fetch(`/api/admin/publishing/${id}/retry`, { method: 'POST' })
      await load()
    } finally {
      setBusy(null)
    }
  }

  function copyText(text: string, key: string) {
    void navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  const exportReady = results.filter(r => r.status === 'export_ready')
  const published = results.filter(r => r.status === 'published')
  const failed = results.filter(r => r.status === 'failed')
  const other = results.filter(r => !['export_ready', 'published', 'failed'].includes(r.status))

  return (
    <div className="space-y-5">
      <PageHeader
        label="Publishing"
        title="Publishing Results"
        description="Publishing requires approval. Only approved assets reach export_ready or published status. No result is shown as published unless the backend confirms it."
        badge={
          <button onClick={load} className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        }
      />

      {/* Platform credentials notice */}
      <div className="rounded-xl border border-amber-400/20 bg-amber-400/8 px-4 py-3">
        <p className="text-xs font-bold text-amber-300">Direct publishing requires platform API credentials. When not configured, status is <code className="rounded bg-amber-900/30 px-1">provider_not_configured</code> and an export package is prepared for manual posting.</p>
      </div>

      {loading && <LoadingState label="Loading publishing results…" />}
      {!loading && error && <ErrorState message={error} retry={load} />}

      {!loading && !error && results.length === 0 && (
        <SectionCard>
          <EmptyState
            icon={<Send className="h-10 w-10" />}
            title="No publishing results yet"
            description="Export packages and publishing results appear here after approved items are processed."
          />
        </SectionCard>
      )}

      {exportReady.length > 0 && (
        <SectionCard title={`Export Ready (${exportReady.length})`}>
          <p className="mb-3 text-xs text-slate-400">These items are approved and ready for manual posting. Copy the content below and post to the platform.</p>
          <div className="space-y-2">
            {exportReady.map(r => <ResultCard key={r.id} result={r} busy={busy === r.id} onRetry={retryPublish} onCopy={copyText} copied={copied} />)}
          </div>
        </SectionCard>
      )}

      {published.length > 0 && (
        <SectionCard title={`Published (${published.length})`}>
          <div className="space-y-2">
            {published.map(r => <ResultCard key={r.id} result={r} busy={busy === r.id} onRetry={retryPublish} onCopy={copyText} copied={copied} />)}
          </div>
        </SectionCard>
      )}

      {failed.length > 0 && (
        <SectionCard title={`Failed (${failed.length})`}>
          <div className="space-y-2">
            {failed.map(r => <ResultCard key={r.id} result={r} busy={busy === r.id} onRetry={retryPublish} onCopy={copyText} copied={copied} />)}
          </div>
        </SectionCard>
      )}

      {other.length > 0 && (
        <SectionCard title={`Other (${other.length})`}>
          <div className="space-y-2">
            {other.map(r => <ResultCard key={r.id} result={r} busy={busy === r.id} onRetry={retryPublish} onCopy={copyText} copied={copied} />)}
          </div>
        </SectionCard>
      )}
    </div>
  )
}

function ResultCard({ result, busy, onRetry, onCopy, copied }: {
  result: PublishingResult
  busy: boolean
  onRetry: (id: string) => void
  onCopy: (text: string, key: string) => void
  copied: string | null
}) {
  return (
    <div className="rounded-xl border border-slate-700/40 bg-slate-950/45 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <StatusBadge status={STATUS_LEVEL[result.status] ?? 'unknown'} label={STATUS_DISPLAY[result.status] ?? result.status} />
            <span className="rounded-md border border-slate-600 bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">{result.platform}</span>
          </div>
          {result.externalPostUrl && (
            <a href={result.externalPostUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-bold text-cyan-400 hover:text-cyan-300">
              View post →
            </a>
          )}
          {result.exportPackageId && (
            <p className="mt-1 text-[10px] text-slate-500">Export package: {result.exportPackageId}</p>
          )}
          {result.error && <p className="mt-1 text-xs text-red-300">{result.error}</p>}
          {result.publishedAt && <p className="mt-0.5 text-[10px] text-emerald-400">Published: {new Date(result.publishedAt).toLocaleString()}</p>}
        </div>
        <div className="flex items-center gap-2">
          {result.exportPackageId && (
            <button
              onClick={() => onCopy(result.exportPackageId!, `pkg-${result.id}`)}
              className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs font-bold text-slate-400 hover:text-slate-200"
            >
              {copied === `pkg-${result.id}` ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              {copied === `pkg-${result.id}` ? 'Copied' : 'Copy ID'}
            </button>
          )}
          {result.status === 'failed' && (
            <button
              onClick={() => onRetry(result.id)}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/15 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Retry'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
