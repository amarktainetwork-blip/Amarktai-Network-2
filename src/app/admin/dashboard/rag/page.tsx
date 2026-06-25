'use client'

import { useCallback, useEffect, useState } from 'react'
import { Database, Loader2, RefreshCw, Search } from 'lucide-react'
import { EmptyState, ErrorState, LoadingState, PageHeader, SectionCard, StatusBadge } from '@/components/dashboard/ui'

interface RAGSource {
  id: string
  title: string
  url: string
  type: string
  chunksCount: number
  ingestedAt: string
}

interface RAGQueryResult {
  answer: string
  context: string
  chunks: { id: string; title: string; score: number; text: string; source?: string }[]
  citations: string[]
}

export default function RAGPage() {
  const [sources, setSources] = useState<RAGSource[]>([])
  const [loadingSources, setLoadingSources] = useState(true)
  const [sourcesError, setSourcesError] = useState<string | null>(null)

  const [ingestUrl, setIngestUrl] = useState('')
  const [ingesting, setIngesting] = useState(false)
  const [ingestResult, setIngestResult] = useState<{ ingested: number; results: unknown[] } | null>(null)
  const [ingestError, setIngestError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [querying, setQuerying] = useState(false)
  const [queryResult, setQueryResult] = useState<RAGQueryResult | null>(null)
  const [queryError, setQueryError] = useState<string | null>(null)

  const loadSources = useCallback(async () => {
    setSourcesError(null)
    try {
      const res = await fetch('/api/admin/rag/sources?appSlug=dashboard', { cache: 'no-store' })
      const data = await res.json() as { sources?: RAGSource[]; error?: string }
      setSources(data.sources ?? [])
      if (!res.ok) setSourcesError(data.error ?? 'Failed to load sources')
    } catch (e) {
      setSourcesError(e instanceof Error ? e.message : 'Failed to load sources')
    } finally {
      setLoadingSources(false)
    }
  }, [])

  useEffect(() => { void loadSources() }, [loadSources])

  async function ingest() {
    if (!ingestUrl.trim()) return
    setIngesting(true)
    setIngestError(null)
    setIngestResult(null)
    try {
      const res = await fetch('/api/admin/rag/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: ingestUrl.trim(), appSlug: 'dashboard' }),
      })
      const data = await res.json() as { ingested?: number; results?: unknown[]; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Ingestion failed')
      setIngestResult({ ingested: data.ingested ?? 0, results: data.results ?? [] })
      setIngestUrl('')
      await loadSources()
    } catch (e) {
      setIngestError(e instanceof Error ? e.message : 'Ingestion failed')
    } finally {
      setIngesting(false)
    }
  }

  async function runQuery() {
    if (!query.trim()) return
    setQuerying(true)
    setQueryError(null)
    setQueryResult(null)
    try {
      const res = await fetch('/api/admin/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), appSlug: 'dashboard', limit: 5 }),
      })
      const data = await res.json() as { answer?: string; context?: string; chunks?: { id: string; title: string; score: number; text: string; source?: string }[]; citations?: string[]; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Query failed')
      setQueryResult({
        answer: data.answer ?? '',
        context: data.context ?? '',
        chunks: data.chunks ?? [],
        citations: data.citations ?? [],
      })
    } catch (e) {
      setQueryError(e instanceof Error ? e.message : 'Query failed')
    } finally {
      setQuerying(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        label="RAG"
        title="Knowledge Base"
        description="Ingest website content and query the retrieval-augmented knowledge base. Powered by HuggingFace embeddings and Qdrant."
        badge={
          <button onClick={loadSources} className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_400px]">
        <div className="space-y-5">
          {/* Ingest section */}
          <SectionCard title="Ingest Source">
            <div className="space-y-3">
              <p className="text-xs text-slate-400">Enter a website URL to scrape and ingest into the knowledge base. HuggingFace API key must be configured in Settings.</p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={ingestUrl}
                  onChange={e => setIngestUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="flex-1 rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-300 placeholder-slate-600 outline-none focus:border-cyan-500/40"
                  onKeyDown={e => { if (e.key === 'Enter') void ingest() }}
                />
                <button
                  onClick={ingest}
                  disabled={ingesting || !ingestUrl.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
                >
                  {ingesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                  {ingesting ? 'Ingesting…' : 'Ingest'}
                </button>
              </div>
              {ingestError && <p className="text-xs text-red-300">{ingestError}</p>}
              {ingestResult && (
                <p className="text-xs text-emerald-300">
                  Ingested {ingestResult.ingested} page(s) into the knowledge base.
                </p>
              )}
            </div>
          </SectionCard>

          {/* Query section */}
          <SectionCard title="Query Knowledge Base">
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Ask a question…"
                  className="flex-1 rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-300 placeholder-slate-600 outline-none focus:border-cyan-500/40"
                  onKeyDown={e => { if (e.key === 'Enter') void runQuery() }}
                />
                <button
                  onClick={runQuery}
                  disabled={querying || !query.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
                >
                  {querying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  {querying ? 'Querying…' : 'Query'}
                </button>
              </div>
              {queryError && <p className="text-xs text-red-300">{queryError}</p>}
              {queryResult && (
                <div className="space-y-4">
                  {queryResult.answer && (
                    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/8 p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-cyan-300 mb-2">Answer</p>
                      <p className="text-sm text-slate-200">{queryResult.answer}</p>
                    </div>
                  )}
                  {queryResult.chunks.length > 0 && (
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-slate-400 mb-2">Retrieved Sources ({queryResult.chunks.length})</p>
                      <div className="space-y-2">
                        {queryResult.chunks.map((chunk, i) => (
                          <div key={chunk.id ?? i} className="rounded-xl border border-slate-700/40 bg-slate-950/45 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-bold text-slate-300">{chunk.title}</p>
                              <span className="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                                score {chunk.score.toFixed(3)}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-500 line-clamp-3">{chunk.text}</p>
                            {chunk.source && <p className="mt-1 text-[10px] text-cyan-600">{chunk.source}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {queryResult.citations.length > 0 && (
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-slate-400 mb-1">Citations</p>
                      <ul className="space-y-0.5">
                        {queryResult.citations.map((c, i) => (
                          <li key={i} className="text-[11px] text-slate-500">{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Sources panel */}
        <SectionCard title={`Ingested Sources (${sources.length})`}>
          {loadingSources && <LoadingState label="Loading sources…" />}
          {!loadingSources && sourcesError && <ErrorState message={sourcesError} retry={loadSources} />}
          {!loadingSources && !sourcesError && sources.length === 0 && (
            <EmptyState
              icon={<Database className="h-8 w-8" />}
              title="No sources yet"
              description="Ingest a website URL to populate the knowledge base."
            />
          )}
          {sources.length > 0 && (
            <div className="space-y-2">
              {sources.map(s => (
                <div key={s.id} className="rounded-xl border border-slate-700/40 bg-slate-950/45 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-slate-300 line-clamp-1">{s.title}</p>
                    <StatusBadge status="healthy" label={s.type} />
                  </div>
                  {s.url && <p className="mt-0.5 text-[10px] text-cyan-600 line-clamp-1">{s.url}</p>}
                  <p className="mt-0.5 text-[10px] text-slate-600">{s.chunksCount} chunk{s.chunksCount !== 1 ? 's' : ''}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
