import { listRecords, LOCAL_STORE_FILES } from '@/lib/local-json-store'
import { listArtifacts, type ArtifactRecord } from '@/lib/artifact-store'
import Image from 'next/image'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

type LocalArtifact = {
  id: string
  appSlug?: string
  title?: string
  description?: string
  type?: string
  subType?: string
  status?: string
  provider?: string
  model?: string
  createdAt?: string
  storagePath?: string
  storageUrl?: string
  contentUrl?: string
  url?: string
  mimeType?: string
  fileSizeBytes?: number
  metadata?: Record<string, unknown>
}

export default async function OutputsPage() {
  const localArtifacts = listRecords<LocalArtifact>(LOCAL_STORE_FILES.artifacts)
  const databaseArtifacts = await listArtifacts({ limit: 200 })
    .then((result) => result.artifacts)
    .catch(() => [])

  const merged = new Map<string, LocalArtifact | ArtifactRecord>()

  for (const artifact of [...localArtifacts, ...databaseArtifacts]) {
    if (!artifact?.id) continue
    merged.set(artifact.id, artifact)
  }

  const artifacts = Array.from(merged.values())
    .filter((artifact) => artifact.status !== 'failed' && artifact.status !== 'processing')
    .filter(isDisplayableArtifact)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-cyan-400/20 bg-slate-900/70 p-6">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Outputs</p>
        <h1 className="mt-2 text-3xl font-black text-white">Real artifacts, in one library.</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Generated media, transcripts, reports, patches, and repository outputs appear here from the live artifact store.
        </p>
        <p className="mt-3 text-xs font-bold text-slate-500">
          Showing {artifacts.length} completed artifact{artifacts.length === 1 ? '' : 's'}.
        </p>
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
            const type = String(artifact.type || 'artifact')
            const appSlug = getStringField(artifact, 'appSlug') || 'workspace'
            const mimeType = getStringField(artifact, 'mimeType') || getStringMetadata(artifact, 'mimeType') || 'unknown MIME'
            const fileSize = getNumberField(artifact, 'fileSizeBytes')

            return (
              <article key={artifact.id} className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-white">{artifact.title || artifact.id}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-cyan-300">
                      {type}{artifact.subType ? ` / ${artifact.subType}` : ''}
                    </p>
                  </div>
                  <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] font-black text-slate-400">
                    {artifact.status || 'saved'}
                  </span>
                </div>

                <ArtifactPreview artifact={artifact} url={url} />

                <dl className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs">
                  <Meta label="App" value={appSlug} />
                  <Meta label="MIME" value={mimeType} />
                  <Meta label="Size" value={formatBytes(fileSize)} />
                  <Meta label="Provider" value={artifact.provider || 'local'} />
                  <Meta label="Model" value={artifact.model || 'unknown'} />
                  <Meta label="Created" value={formatCreatedAt(artifact.createdAt)} />
                </dl>

                {url ? (
                  <a href={url} download className="mt-3 inline-block text-xs font-black text-cyan-300">
                    Open or download artifact
                  </a>
                ) : (
                  <p className="mt-3 text-xs font-bold text-amber-300">No playable storage URL found.</p>
                )}
              </article>
            )
          })}
        </section>
      )}
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-black uppercase tracking-[0.14em] text-slate-600">{label}</dt>
      <dd className="mt-1 break-words font-bold text-slate-300">{value}</dd>
    </div>
  )
}

function ArtifactPreview({ artifact, url }: { artifact: LocalArtifact | ArtifactRecord; url: string }) {
  const type = String(artifact.type ?? '')
  if (type === 'image' && url) {
    return (
      <Image
        unoptimized
        width={960}
        height={540}
        src={url}
        alt={artifact.title || 'Generated image'}
        className="mt-4 aspect-video w-full rounded-xl border border-slate-700 object-cover"
      />
    )
  }
  if ((type === 'audio' || type === 'music') && url) {
    return <audio controls preload="metadata" src={url} className="mt-4 w-full" />
  }
  if (type === 'video' && url) {
    return <video controls preload="metadata" src={url} className="mt-4 aspect-video w-full rounded-xl border border-slate-700 bg-black" />
  }
  if (['transcript', 'report', 'document', 'code'].includes(type)) {
    return (
      <p className="mt-4 line-clamp-5 whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs leading-5 text-slate-400">
        {artifact.description || textFromMetadata(artifact)}
      </p>
    )
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

function getStringField(artifact: LocalArtifact | ArtifactRecord, key: keyof LocalArtifact) {
  const value = artifact[key as keyof typeof artifact]
  return typeof value === 'string' ? value : ''
}

function getStringMetadata(artifact: LocalArtifact | ArtifactRecord, key: string) {
  const value = artifact.metadata?.[key]
  return typeof value === 'string' ? value : ''
}

function getNumberField(artifact: LocalArtifact | ArtifactRecord, key: keyof LocalArtifact) {
  const value = artifact[key as keyof typeof artifact]
  return typeof value === 'number' ? value : 0
}

function formatBytes(value: number) {
  if (!value || value < 0) return 'unknown'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

function formatCreatedAt(value: Date | string | undefined) {
  if (!value) return 'Creation time unavailable'
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
}
