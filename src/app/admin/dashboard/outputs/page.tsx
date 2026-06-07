import { listRecords, LOCAL_STORE_FILES } from '@/lib/local-json-store'
import { listArtifacts, type ArtifactRecord } from '@/lib/artifact-store'
import Image from 'next/image'

type LocalArtifact = {
  id: string
  title?: string
  description?: string
  type?: string
  subType?: string
  status?: string
  provider?: string
  model?: string
  createdAt?: string
  storageUrl?: string
  contentUrl?: string
  url?: string
  metadata?: Record<string, unknown>
}

export default async function OutputsPage() {
  const localArtifacts = listRecords<LocalArtifact>(LOCAL_STORE_FILES.artifacts)
  const databaseArtifacts = await listArtifacts({ limit: 100 }).then((result) => result.artifacts).catch(() => [])
  const artifacts: Array<LocalArtifact | ArtifactRecord> = [...databaseArtifacts, ...localArtifacts]
    .filter((artifact) => artifact.status !== 'failed' && artifact.status !== 'processing')
    .filter(isDisplayableArtifact)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-cyan-400/20 bg-slate-900/70 p-6">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Outputs</p>
        <h1 className="mt-2 text-3xl font-black text-white">Real artifacts, in one library.</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Generated media, transcripts, reports, patches, and repository outputs appear here. Planning-only results are labeled as plans.</p>
      </section>

      {!artifacts.length ? (
        <section className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-12 text-center">
          <p className="font-black text-slate-300">No real outputs yet.</p>
          <p className="mt-2 text-sm text-slate-500">Completed, persisted artifacts will appear after a successful run.</p>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {artifacts.map((artifact) => {
            const url = getArtifactUrl(artifact)
            return (
              <article key={artifact.id} className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-white">{artifact.title || artifact.id}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-cyan-300">{artifact.type || 'artifact'} {artifact.subType ? `/ ${artifact.subType}` : ''}</p>
                  </div>
                  <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] font-black text-slate-400">{artifact.status || 'saved'}</span>
                </div>
                <ArtifactPreview artifact={artifact} url={url} />
                <p className="mt-4 text-xs text-slate-500">{artifact.provider || 'local'} {artifact.model ? `/ ${artifact.model}` : ''}</p>
                <p className="mt-1 text-xs text-slate-600">{formatCreatedAt(artifact.createdAt)}</p>
                {url && <a href={url} download className="mt-3 inline-block text-xs font-black text-cyan-300">Open or download artifact</a>}
              </article>
            )
          })}
        </section>
      )}
    </div>
  )
}

function ArtifactPreview({ artifact, url }: { artifact: LocalArtifact | ArtifactRecord; url: string }) {
  const type = String(artifact.type ?? '')
  if (type === 'image' && url) return <Image unoptimized width={960} height={540} src={url} alt={artifact.title || 'Generated image'} className="mt-4 aspect-video w-full rounded-xl border border-slate-700 object-cover" />
  if ((type === 'audio' || type === 'music') && url) return <audio controls preload="metadata" src={url} className="mt-4 w-full" />
  if (type === 'video' && url) return <video controls preload="metadata" src={url} className="mt-4 aspect-video w-full rounded-xl border border-slate-700 bg-black" />
  if (['transcript', 'report', 'document', 'code'].includes(type)) {
    return <p className="mt-4 line-clamp-5 whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs leading-5 text-slate-400">{artifact.description || textFromMetadata(artifact)}</p>
  }
  return null
}

function getArtifactUrl(artifact: LocalArtifact | ArtifactRecord) {
  if (artifact.storageUrl) return artifact.storageUrl
  if ('contentUrl' in artifact && artifact.contentUrl) return artifact.contentUrl
  if ('url' in artifact && artifact.url) return artifact.url
  if (artifact.metadata && typeof artifact.metadata === 'object') {
    for (const key of ['mediaUrl', 'resultUrl', 'imageUrl', 'audioUrl', 'musicUrl', 'videoUrl']) {
      const value = artifact.metadata[key]
      if (typeof value === 'string' && value) return value
    }
  }
  return ''
}

function isDisplayableArtifact(artifact: LocalArtifact | ArtifactRecord) {
  const type = String(artifact.type ?? '')
  if (['image', 'audio', 'music', 'video'].includes(type)) return Boolean(getArtifactUrl(artifact))
  return Boolean(artifact.id && type)
}

function textFromMetadata(artifact: LocalArtifact | ArtifactRecord) {
  const metadata = artifact.metadata
  if (!metadata || typeof metadata !== 'object') return 'Saved text artifact'
  for (const key of ['text', 'transcript', 'summary', 'content']) {
    const value = metadata[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return 'Saved text artifact'
}

function formatCreatedAt(value: Date | string | undefined) {
  if (!value) return 'Creation time unavailable'
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
}
