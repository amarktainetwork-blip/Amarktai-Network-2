'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Archive, ArrowLeft, ExternalLink, FileJson, Image as ImageIcon, Music, RefreshCw } from 'lucide-react'

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
  metadata: Record<string, unknown>
}

function iconFor(contentType: string) {
  if (contentType.includes('image')) return <ImageIcon className="h-4 w-4 text-cyan-300" />
  if (contentType.includes('audio')) return <Music className="h-4 w-4 text-violet-300" />
  return <FileJson className="h-4 w-4 text-amber-300" />
}

export default function MediaArtifactsPage() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [appSlug, setAppSlug] = useState('amarktai-network')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/artifacts/media?appSlug=${encodeURIComponent(appSlug)}&limit=100`)
      const data = await res.json()
      if (!res.ok || data.success === false) throw new Error(data.error ?? `HTTP ${res.status}`)
      setArtifacts(data.artifacts ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load artifacts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-[#0d1a2e] to-[#060d1b] p-6">
        <Link href="/admin/dashboard/artifacts" className="mb-4 inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Artifacts
        </Link>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Archive className="h-6 w-6 text-cyan-400" />
              <h1 className="text-2xl font-bold text-white">Media Artifact Gallery</h1>
            </div>
            <p className="max-w-3xl text-sm text-slate-400">
              Browse generated files and task outputs saved by specialist providers like Hugging Face, Qwen Wanx and MiniMax/Mimo.
            </p>
          </div>
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 hover:text-white disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <label className="text-[11px] uppercase tracking-wider text-slate-500">App slug</label>
        <div className="mt-2 flex gap-2">
          <input value={appSlug} onChange={(event) => setAppSlug(event.target.value)} className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none" />
          <button onClick={load} className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-100">Load</button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-200">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {artifacts.map((artifact) => (
          <article key={artifact.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
            <div className="border-b border-white/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {iconFor(artifact.contentType)}
                  <p className="text-sm font-semibold text-white">{artifact.provider}</p>
                </div>
                <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-slate-400">{artifact.capability}</span>
              </div>
              <p className="mt-1 truncate font-mono text-[10px] text-slate-500">{artifact.model}</p>
            </div>

            {artifact.contentType.includes('image') && (
              <div className="aspect-video bg-black/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={artifact.publicPath} alt={artifact.capability} className="h-full w-full object-cover" />
              </div>
            )}
            {artifact.contentType.includes('audio') && (
              <div className="p-4">
                <audio src={artifact.publicPath} controls className="w-full" />
              </div>
            )}

            <div className="space-y-2 p-4 text-xs text-slate-400">
              <div className="flex justify-between gap-3"><span>Created</span><span>{new Date(artifact.createdAt).toLocaleString()}</span></div>
              <div className="flex justify-between gap-3"><span>Size</span><span>{Math.round(artifact.sizeBytes / 1024)} KB</span></div>
              <div className="flex justify-between gap-3"><span>Type</span><span className="truncate">{artifact.contentType}</span></div>
              <a href={artifact.publicPath} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-100">
                Open artifact <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </article>
        ))}
        {!loading && artifacts.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-slate-500 md:col-span-2 xl:col-span-3">
            No media artifacts yet. Generate specialist media or run provider capability tests with artifact saving enabled.
          </div>
        )}
      </div>
    </div>
  )
}
