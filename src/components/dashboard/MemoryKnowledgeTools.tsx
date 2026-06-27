'use client'

import { useState } from 'react'
import { FileUp, Globe2, Loader2, Search, Save } from 'lucide-react'

export default function MemoryKnowledgeTools() {
  const [appSlug, setAppSlug] = useState('dashboard')
  const [url, setUrl] = useState('')
  const [query, setQuery] = useState('')
  const [notes, setNotes] = useState('')
  const [mode, setMode] = useState<'scrape' | 'ingest' | 'query'>('scrape')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState('')

  async function run() {
    setBusy(true)
    setMessage('')
    setPreview('')
    try {
      const route = mode === 'query'
        ? '/api/admin/rag/query'
        : mode === 'ingest'
          ? '/api/admin/rag/ingest'
          : '/api/admin/research/url'
      const body = mode === 'query'
        ? { query, appSlug, scope: 'app', limit: 5 }
        : { url, appSlug, notes, tags: ['dashboard'] }
      const response = await fetch(route, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json().catch(() => ({}))
      setMessage(response.ok ? `${mode} completed through ${route}` : data.error ?? `${mode} failed through ${route}`)
      setPreview(JSON.stringify(data, null, 2).slice(0, 1600))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Knowledge action failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Knowledge tools</p>
          <h2 className="mt-2 text-lg font-black text-white">Scrape, ingest, query, and save context</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Wired to `/api/admin/research/url`, `/api/admin/rag/ingest`, and `/api/admin/rag/query`.
          </p>
        </div>
        <select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-slate-200">
          <option value="scrape">URL scrape</option>
          <option value="ingest">Save to RAG</option>
          <option value="query">Query/test RAG</option>
        </select>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <Field label="App / memory scope">
          <input value={appSlug} onChange={(event) => setAppSlug(event.target.value)} className="dashboard-input" />
        </Field>
        {mode === 'query' ? (
          <Field label="Query input">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ask stored knowledge..." className="dashboard-input" />
          </Field>
        ) : (
          <Field label="URL input">
            <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com" className="dashboard-input" />
          </Field>
        )}
        <Field label="Document upload">
          <input type="file" data-knowledge-document-upload="true" className="block w-full text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-xs file:font-black file:text-slate-200" />
        </Field>
      </div>

      <label className="mt-3 block">
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Notes / save to memory</span>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="dashboard-input mt-1.5 min-h-24 resize-y" />
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void run()} disabled={busy || (mode === 'query' ? !query.trim() : !url.trim())} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-black text-slate-950 disabled:opacity-40">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'query' ? <Search className="h-4 w-4" /> : mode === 'ingest' ? <Save className="h-4 w-4" /> : <Globe2 className="h-4 w-4" />}
          {mode === 'query' ? 'Query RAG' : mode === 'ingest' ? 'Ingest URL' : 'Scrape URL'}
        </button>
        <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
          <FileUp className="h-3.5 w-3.5" />
          Document upload UI is present; backend currently ingests URL JSON, not multipart documents.
        </span>
      </div>

      {message && <p className="mt-4 text-sm font-bold text-slate-300">{message}</p>}
      {preview && <pre className="mt-3 max-h-80 overflow-auto rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs leading-6 text-slate-400">{preview}</pre>}
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</span><span className="mt-1.5 block">{children}</span></label>
}
