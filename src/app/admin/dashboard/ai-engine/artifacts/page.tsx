'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, ImageIcon, RefreshCw } from 'lucide-react'

interface Artifact {
  id: string
  appSlug: string
  provider: string
  model: string
  capability: string
  contentType: string
  publicPath: string
  sizeBytes: number
  createdAt: string
  metadata?: Record<string, unknown>
}

export default function MediaArtifactsPage() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [appSlug, setAppSlug] = useState('amarktai-network')
  const [provider, setProvider] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const qs = new URLSearchParams({ appSlug, limit: '100' })
      if (provider.trim()) qs.set('provider', provider.trim())
      const res = await fetch(`/api/admin/artifacts/media?${qs.toString()}`)
      const data = await res.json()
      if (!res.ok || data.success === false) throw new Error(data.error ?? 'Failed to load artifacts')
      setArtifacts(data.artifacts ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load artifacts')
    } finally {
      setLoading(false)
    }
  }, [appSlug, provider])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-[#0d1a2e] to-[#060d1b] p-6">
        <Link href="/admin/dashboard/ai-engine" className="mb-4 inline-flex items-center gap-2 text-xs text-slate-500 hover:text-cyan-300"><ArrowLeft className="h-3.5 w-3.5" /> AI Engine</Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2"><ImageIcon className="h-6 w-6 text-cyan-300" /><h1 className="text-2xl font-bold text-white">Artifact Gallery</h1></div>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">Browse generated media and provider task artifacts saved by specialist routes.</p>
          </div>
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 hover:text-white disabled:opacity-40"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input value={appSlug} onChange={(e) => setAppSlug(e.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none" />
          <input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="provider filter, optional" className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none" />
          <button onClick={load} className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100">Apply</button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {artifacts.map((artifact) => (
          <article key={artifact.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-white">{artifact.provider} / {artifact.capability}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{artifact.model}</p>
              </div>
              <a href={artifact.publicPath} target="_blank" className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-2 text-cyan-200"><ExternalLink className="h-4 w-4" /></a>
            </div>
            {artifact.contentType.startsWith('image/') ? (
              <img src={artifact.publicPath} alt={artifact.capability} className="mb-3 h-48 w-full rounded-xl object-cover" />
            ) : artifact.contentType.startsWith('audio/') ? (
              <audio controls className="mb-3 w-full" src={artifact.publicPath} />
            ) : (
              <div className="mb-3 rounded-xl border border-white/10 bg-black/20 p-6 text-center text-xs text-slate-500">{artifact.contentType}</div>
            )}
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
              <span>{Math.round(artifact.sizeBytes / 1024)} KB</span>
              <span className="text-right">{new Date(artifact.createdAt).toLocaleString()}</span>
            </div>
          </article>
        ))}
      </div>

      {artifacts.length === 0 && !loading && <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-slate-500">No artifacts yet. Run a specialist provider generation first.</div>}
    </div>
  )
}
