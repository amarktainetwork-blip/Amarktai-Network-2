'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import type { ArtifactRecord } from '@/lib/artifact-store'
import { archiveConfirmationBody, serializeArtifactReuse } from '@/lib/artifact-client'

type ArtifactResponse = {
  artifacts: ArtifactRecord[]
  total: number
  empty?: boolean
  unavailable?: boolean
  error?: string
}

const TYPES = [
  'all',
  'text',
  'report',
  'image',
  'audio',
  'music',
  'video',
  'voice',
  'avatar',
  'repo_patch',
  'repo_diff',
  'app_blueprint',
  'deployment_plan',
  'research_result',
  'code',
  'document',
  'transcript',
]

const STATUSES = ['all', 'completed', 'pending', 'processing', 'failed', 'archived']

export default function ArtifactsPage() {
  const [artifacts, setArtifacts] = useState<ArtifactRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')
  const [appSlug, setAppSlug] = useState('')
  const [capability, setCapability] = useState('')
  const [selected, setSelected] = useState<ArtifactRecord | null>(null)
  const [actionMessage, setActionMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams({ limit: '200' })
    if (type !== 'all') params.set('type', type)
    if (status !== 'all') params.set('status', status)
    if (appSlug.trim()) params.set('appSlug', appSlug.trim())
    if (capability.trim()) params.set('capability', capability.trim())
    try {
      const response = await fetch(`/api/admin/artifacts?${params}`, { cache: 'no-store' })
      const data = await response.json() as ArtifactResponse
      if (!response.ok) throw new Error(data.error || 'Artifact Library is unavailable')
      setArtifacts(data.artifacts)
    } catch (loadError) {
      setArtifacts([])
      setError(loadError instanceof Error ? loadError.message : 'Artifact Library is unavailable')
    } finally {
      setLoading(false)
    }
  }, [appSlug, capability, status, type])

  useEffect(() => {
    void load()
  }, [load])

  const apps = useMemo(
    () => Array.from(new Set(artifacts.map((artifact) => artifact.appSlug).filter(Boolean))).sort(),
    [artifacts],
  )

  async function reuseArtifact(artifact: ArtifactRecord) {
    setActionMessage('')
    const response = await fetch(`/api/admin/artifacts/${artifact.id}/reuse`, { method: 'POST' })
    const data = await response.json()
    if (!response.ok) return setActionMessage(data.error || 'Artifact reuse failed')
    await navigator.clipboard.writeText(serializeArtifactReuse(data.reuse))
    setActionMessage(`Reusable metadata for "${artifact.title || artifact.id}" copied.`)
  }

  async function archiveArtifact(artifact: ArtifactRecord) {
    if (!window.confirm(`Archive "${artifact.title || artifact.id}"? The stored file will be retained.`)) return
    const response = await fetch(`/api/admin/artifacts/${artifact.id}/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: archiveConfirmationBody(),
    })
    const data = await response.json()
    if (!response.ok) return setActionMessage(data.error || 'Artifact archive failed')
    setSelected(null)
    setActionMessage(`Archived "${artifact.title || artifact.id}".`)
    await load()
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-cyan-400/20 bg-slate-900/70 p-6">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Artifacts</p>
        <h1 className="mt-2 text-3xl font-black text-white">Artifact Library</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Persisted outputs from executions and jobs. Pending work remains pending and never presents itself as a completed artifact.
        </p>
      </section>

      <section className="grid gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 md:grid-cols-4">
        <Filter label="Type" value={type} onChange={setType} options={TYPES} />
        <Filter label="Status" value={status} onChange={setStatus} options={STATUSES} />
        <TextFilter label="App / project" value={appSlug} onChange={setAppSlug} list="artifact-apps" />
        <TextFilter label="Capability" value={capability} onChange={setCapability} />
        <datalist id="artifact-apps">{apps.map((app) => <option key={app} value={app} />)}</datalist>
      </section>

      {actionMessage && <p className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">{actionMessage}</p>}
      {error && <EmptyState title="Artifact Library unavailable" detail={error} />}
      {loading && <EmptyState title="Loading persisted artifacts" detail="Reading the canonical artifact store." />}
      {!loading && !error && artifacts.length === 0 && (
        <EmptyState title="No artifacts match these filters" detail="Completed persisted outputs will appear here. No demo outputs are inserted." />
      )}

      {!loading && artifacts.length > 0 && (
        <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {artifacts.map((artifact) => (
            <article key={artifact.id} className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/60">
              <ArtifactPreview artifact={artifact} />
              <div className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-black text-white">{artifact.title || artifact.id}</h2>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-cyan-300">{artifact.type} / {artifact.capability}</p>
                  </div>
                  <Status value={artifact.status} />
                </div>
                <p className="line-clamp-3 text-sm leading-6 text-slate-400">{artifact.summary || 'No summary supplied.'}</p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <Meta label="App" value={artifact.appSlug || artifact.appId || 'Unscoped'} />
                  <Meta label="File" value={`${formatBytes(artifact.fileSize)} / ${artifact.mimeType || 'unknown MIME'}`} />
                  <Meta label="Execution" value={artifact.executionId || 'Not linked'} />
                  <Meta label="Job" value={artifact.jobId || 'Not linked'} />
                </dl>
                <p className="text-xs text-slate-600">{formatDate(artifact.createdAt)}</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setSelected(artifact)} className="action">Details</button>
                  {artifact.status === 'completed' && <>
                    <a className="action" href={artifact.previewUrl} target="_blank" rel="noreferrer">Open</a>
                    <a className="action" href={`${artifact.downloadUrl}?download=1`}>Download</a>
                    <button className="action" onClick={() => void reuseArtifact(artifact)}>Reuse</button>
                  </>}
                  {!['pending', 'processing', 'archived'].includes(artifact.status) && (
                    <button className="action text-amber-300" onClick={() => void archiveArtifact(artifact)}>Archive</button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {selected && (
        <section className="rounded-2xl border border-cyan-400/30 bg-slate-950 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Artifact detail</p>
              <h2 className="mt-2 text-xl font-black text-white">{selected.title || selected.id}</h2>
            </div>
            <button className="action" onClick={() => setSelected(null)}>Close</button>
          </div>
          <dl className="mt-4 grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 text-xs md:grid-cols-2">
            {Object.entries(selected.metadata).length > 0
              ? Object.entries(selected.metadata).map(([key, value]) => (
                <Meta key={key} label={humanize(key)} value={formatMetadataValue(value)} />
              ))
              : <p className="text-slate-500">No additional metadata was recorded.</p>}
          </dl>
          {(selected.executionId || selected.jobId) && (
            <a className="mt-4 inline-block text-sm font-bold text-cyan-300" href={`/admin/dashboard/jobs?executionId=${encodeURIComponent(selected.executionId || '')}`}>
              Open linked execution / job
            </a>
          )}
        </section>
      )}
      <style jsx>{`
        .action { border: 1px solid rgb(51 65 85); border-radius: 0.65rem; padding: 0.45rem 0.7rem; font-size: 0.75rem; font-weight: 800; color: rgb(165 243 252); }
        .action:hover { border-color: rgb(34 211 238 / 0.55); background: rgb(8 145 178 / 0.1); }
      `}</style>
    </div>
  )
}

function ArtifactPreview({ artifact }: { artifact: ArtifactRecord }) {
  if (artifact.status !== 'completed') {
    return <div className="flex aspect-video items-center justify-center bg-slate-950 text-sm font-bold text-slate-500">Preview unavailable while {artifact.status}</div>
  }
  if (artifact.type === 'image') return <Image unoptimized width={960} height={540} src={artifact.previewUrl} alt={artifact.title || 'Artifact preview'} className="aspect-video w-full object-cover" />
  if (['audio', 'music', 'voice'].includes(artifact.type)) return <div className="bg-slate-950 p-4"><audio controls preload="metadata" src={artifact.previewUrl} className="w-full" /></div>
  if (['video', 'avatar'].includes(artifact.type)) return <video controls preload="metadata" src={artifact.previewUrl} className="aspect-video w-full bg-black" />
  return (
    <div className="flex aspect-video flex-col justify-end bg-gradient-to-br from-slate-950 to-slate-900 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">{previewLabel(artifact.type)}</p>
      <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-slate-400">{artifact.summary || metadataSummary(artifact.metadata)}</p>
    </div>
  )
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <label className="text-xs font-bold text-slate-400">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white">{options.map((option) => <option key={option}>{option}</option>)}</select></label>
}

function TextFilter({ label, value, onChange, list }: { label: string; value: string; onChange: (value: string) => void; list?: string }) {
  return <label className="text-xs font-bold text-slate-400">{label}<input list={list} value={value} onChange={(event) => onChange(event.target.value)} placeholder="All" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" /></label>
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-slate-600">{label}</dt><dd className="mt-1 truncate text-slate-300" title={value}>{value}</dd></div>
}

function Status({ value }: { value: string }) {
  const color = value === 'completed' ? 'text-emerald-300 border-emerald-500/30' : value === 'failed' ? 'text-rose-300 border-rose-500/30' : 'text-amber-300 border-amber-500/30'
  return <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase ${color}`}>{value}</span>
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <section className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-12 text-center"><p className="font-black text-slate-300">{title}</p><p className="mt-2 text-sm text-slate-500">{detail}</p></section>
}

function previewLabel(type: string) {
  if (type === 'repo_patch' || type === 'repo_diff') return 'Repository change'
  if (type === 'app_blueprint') return 'App blueprint'
  if (type === 'research_result') return 'Research result'
  if (type === 'deployment_plan') return 'Deployment plan'
  return 'Text / document output'
}

function metadataSummary(metadata: Record<string, unknown>) {
  for (const key of ['summary', 'text', 'content', 'transcript']) {
    if (typeof metadata[key] === 'string') return String(metadata[key])
  }
  return 'Open the artifact to inspect its persisted content.'
}

function humanize(value: string) {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ')
}

function formatMetadataValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Not recorded'
  if (Array.isArray(value)) return value.map((entry) => String(entry)).join(', ') || 'Empty list'
  if (typeof value === 'object') return `Structured metadata: ${Object.keys(value).join(', ')}`
  return String(value)
}

function formatBytes(bytes: number) {
  if (!bytes) return 'Size unavailable'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
}
