import type React from 'react'
import { Archive, Download, ExternalLink, FileAudio, FileImage, FileText, Music, RefreshCw, Video } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { listArtifacts, type ArtifactRecord } from '@/lib/artifact-store'
import { listRecords, LOCAL_STORE_FILES } from '@/lib/local-json-store'

export const dynamic = 'force-dynamic'

type LocalArtifact = {
  id: string
  title?: string
  type?: string
  status?: string
  storageUrl?: string
  storagePath?: string
  provider?: string
  model?: string
  metadata?: Record<string, unknown>
  url?: string
  path?: string
  createdAt?: string
}

type CommandJob = {
  id: string
  prompt?: string
  status?: string
  route?: { intent?: string; surface?: string }
  createdAt?: string
}

type DbAsset = {
  id: string
  assetType: string
  status: string
  approvalStatus: string
  resultUrl: string | null
  resultFilePath: string | null
  thumbnailUrl: string | null
  runtimeSelectedProvider: string
  runtimeSelectedModel: string
  createdAt: Date
}

type DbVideoJob = {
  id: string
  prompt: string
  status: string
  provider: string
  modelId: string
  resultUrl: string | null
  createdAt: Date
}

async function getSnapshot() {
  try {
    const [assets, videoJobs, artifactResult] = await Promise.all([
      prisma.generatedAsset.findMany({
        take: 40,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          assetType: true,
          status: true,
          approvalStatus: true,
          resultUrl: true,
          resultFilePath: true,
          thumbnailUrl: true,
          runtimeSelectedProvider: true,
          runtimeSelectedModel: true,
          createdAt: true,
        },
      }),
      prisma.videoGenerationJob.findMany({
        take: 40,
        orderBy: { createdAt: 'desc' },
        select: { id: true, prompt: true, status: true, provider: true, modelId: true, resultUrl: true, createdAt: true },
      }),
      listArtifacts({ limit: 40 }),
    ])
    return { database: 'working' as const, error: null, assets, videoJobs, artifacts: artifactResult.artifacts }
  } catch (error) {
    return { database: 'failed' as const, error: error instanceof Error ? error.message : 'Database unavailable', assets: [] as DbAsset[], videoJobs: [] as DbVideoJob[], artifacts: [] as ArtifactRecord[] }
  }
}

export default async function AssetsAndJobsPage() {
  const snapshot = await getSnapshot()
  const localArtifacts = listRecords<LocalArtifact>(LOCAL_STORE_FILES.artifacts).slice(-40).reverse()
  const commandJobs = listRecords<CommandJob>('jobs/command-jobs.json').slice(-40).reverse()
  const allJobs = [
    ...snapshot.videoJobs.map((job) => ({
      id: job.id,
      title: job.prompt || 'Video generation job',
      status: job.status,
      provider: job.provider || 'runtime selected after execution',
      model: job.modelId || 'runtime selected after execution',
      href: job.resultUrl ?? '',
      createdAt: job.createdAt.toISOString(),
    })),
    ...commandJobs.map((job) => ({
      id: job.id,
      title: job.prompt || job.route?.intent || 'Capability job',
      status: job.status || 'unknown',
      provider: 'runtime selected after execution',
      model: job.route?.surface || 'command route',
      href: '',
      createdAt: job.createdAt ?? '',
    })),
  ]

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-cyan-300/15 bg-[#071019] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Assets & Jobs</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white">Generated output and job lifecycle</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
              Images, video, music, audio, documents, queued jobs, failures, downloads, and references live here. Publishing and approval state is shown as job/output metadata, not a separate main section.
            </p>
          </div>
          <StatusPill status={snapshot.database === 'working' ? 'database working' : 'database unavailable'} />
        </div>
      </section>

      {snapshot.error && (
        <p className="rounded-lg border border-amber-300/20 bg-amber-300/8 px-3 py-2 text-sm font-bold text-amber-200">
          Database-backed assets and jobs unavailable: {snapshot.error}
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<FileImage />} label="Generated assets" value={String(snapshot.assets.length + snapshot.artifacts.length)} />
        <Metric icon={<Video />} label="Video jobs" value={String(snapshot.videoJobs.length)} />
        <Metric icon={<Archive />} label="Local artifacts" value={String(localArtifacts.length)} />
        <Metric icon={<RefreshCw />} label="Command jobs" value={String(commandJobs.length)} />
      </section>

      <nav className="flex flex-wrap gap-2 rounded-lg border border-slate-800 bg-slate-900/55 p-2" aria-label="Asset filters">
        {['all', 'image', 'video', 'audio', 'document'].map((filter) => (
          <span key={filter} className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs font-black text-slate-300">
            {filter}
          </span>
        ))}
      </nav>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Assets">
          <div className="grid gap-3 lg:grid-cols-2">
            {[...snapshot.assets.map(assetFromDb), ...snapshot.artifacts.map(assetFromCanonical), ...localArtifacts.map(assetFromLocal)].length ? (
              [...snapshot.assets.map(assetFromDb), ...snapshot.artifacts.map(assetFromCanonical), ...localArtifacts.map(assetFromLocal)].map((asset) => (
                <article key={asset.id} className="rounded-lg border border-slate-800 bg-slate-950/55 p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-800 bg-slate-900 text-cyan-300">
                      {assetIcon(asset.type)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="truncate text-sm font-black text-white">{asset.title}</p>
                        <StatusPill status={asset.status} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{asset.type}</p>
                      <p className="mt-1 text-xs text-slate-600">{asset.createdAt}</p>
                      {(asset.provider || asset.model) && (
                        <p className="mt-2 text-xs font-bold text-slate-500">{asset.provider || 'runtime'} / {asset.model || 'model selected at runtime'}</p>
                      )}
                      {asset.capability && <p className="mt-1 text-xs font-bold text-slate-600">{asset.capability}</p>}
                      {asset.brokenReason && <p className="mt-2 rounded-lg border border-red-300/20 bg-red-300/10 px-2 py-1.5 text-xs font-bold text-red-100">{asset.brokenReason}</p>}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {asset.href ? (
                          <a href={asset.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-300/20 bg-cyan-300/8 px-2.5 py-1.5 text-xs font-black text-cyan-200">
                            <ExternalLink className="h-3.5 w-3.5" /> Open
                          </a>
                        ) : <span className="text-xs font-bold text-slate-600">No reference link</span>}
                        {asset.href && (
                          <a href={asset.href} download className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-black text-slate-300">
                            <Download className="h-3.5 w-3.5" /> Download
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <Empty text="No generated assets or local artifact records found." />
            )}
          </div>
        </Panel>

        <Panel title="Jobs">
          {allJobs.length ? (
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="min-w-full divide-y divide-slate-800 text-left text-xs">
                <thead className="bg-slate-950/70 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-black">Job</th>
                    <th className="px-3 py-2 font-black">Status</th>
                    <th className="px-3 py-2 font-black">Runtime</th>
                    <th className="px-3 py-2 font-black">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-950/40">
                  {allJobs.map((job) => (
                    <tr key={job.id}>
                      <td className="max-w-[18rem] px-3 py-3">
                        <p className="line-clamp-1 font-black text-white">{job.title}</p>
                        <p className="mt-1 font-mono text-[11px] text-slate-600">{job.id}</p>
                      </td>
                      <td className="px-3 py-3"><StatusPill status={job.status} /></td>
                      <td className="px-3 py-3 text-slate-400">
                        <p className="font-bold">{job.provider}</p>
                        <p className="mt-1 text-slate-600">{job.model}</p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          {job.href ? (
                            <>
                              <a href={job.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-300/20 bg-cyan-300/8 px-2 py-1.5 font-black text-cyan-200">
                                <ExternalLink className="h-3.5 w-3.5" /> Open
                              </a>
                              <a href={job.href} download className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 font-black text-slate-300">
                                <Download className="h-3.5 w-3.5" /> Download
                              </a>
                            </>
                          ) : (
                            <span className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 font-bold text-slate-600">No output</span>
                          )}
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 font-bold text-slate-500">
                            <RefreshCw className="h-3.5 w-3.5" /> Retry if owner route exists
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty text="No queued, running, failed, or completed jobs found." />
          )}
        </Panel>
      </section>
    </div>
  )
}

function assetFromDb(asset: DbAsset) {
  return {
    id: asset.id,
    title: asset.assetType,
    type: asset.assetType,
    status: asset.approvalStatus || asset.status,
    href: asset.resultUrl ?? asset.thumbnailUrl ?? (asset.resultFilePath ? `/api/artifacts/file/${asset.resultFilePath}` : ''),
    provider: asset.runtimeSelectedProvider,
    model: asset.runtimeSelectedModel,
    capability: asset.assetType,
    createdAt: asset.createdAt.toISOString(),
    brokenReason: '',
  }
}

function assetFromCanonical(artifact: ArtifactRecord) {
  const externalPrimaryUrl = /^https?:\/\//i.test(artifact.storageUrl)
  const missingFile = !artifact.storagePath || !artifact.storageUrl
  return {
    id: artifact.id,
    title: artifact.title || artifact.id,
    type: artifact.type || 'artifact',
    status: missingFile || externalPrimaryUrl ? 'broken' : artifact.status || 'stored',
    href: missingFile || externalPrimaryUrl ? '' : artifact.storageUrl,
    provider: artifact.provider,
    model: artifact.model,
    capability: typeof artifact.metadata.capability === 'string' ? artifact.metadata.capability : artifact.subType,
    createdAt: artifact.createdAt.toISOString(),
    brokenReason: missingFile
      ? 'Broken asset: metadata exists but no platform file is saved.'
      : externalPrimaryUrl
        ? 'Broken asset: provider URL was not ingested into platform storage.'
        : '',
  }
}

function assetFromLocal(artifact: LocalArtifact) {
  const href = artifact.storageUrl || artifact.url || artifact.path || ''
  const externalPrimaryUrl = /^https?:\/\//i.test(href)
  return {
    id: artifact.id,
    title: artifact.title || artifact.id,
    type: artifact.type || 'artifact',
    status: externalPrimaryUrl ? 'broken' : artifact.status || 'stored',
    href: externalPrimaryUrl ? '' : href,
    provider: artifact.provider ?? '',
    model: artifact.model ?? '',
    capability: typeof artifact.metadata?.capability === 'string' ? artifact.metadata.capability : '',
    createdAt: artifact.createdAt ?? '',
    brokenReason: externalPrimaryUrl ? 'Broken asset: provider URL was not ingested into platform storage.' : '',
  }
}

function assetIcon(type: string) {
  const lower = type.toLowerCase()
  if (lower.includes('video')) return <Video className="h-5 w-5" />
  if (lower.includes('audio') || lower.includes('voice')) return <FileAudio className="h-5 w-5" />
  if (lower.includes('music')) return <Music className="h-5 w-5" />
  if (lower.includes('image') || lower.includes('avatar')) return <FileImage className="h-5 w-5" />
  return <FileText className="h-5 w-5" />
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5"><h2 className="text-lg font-black text-white">{title}</h2><div className="mt-4">{children}</div></section>
}

function Metric({ icon, label, value }: { icon: React.ReactElement; label: string; value: string }) {
  return <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4"><span className="text-cyan-300 [&_svg]:h-5 [&_svg]:w-5">{icon}</span><p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-white">{value}</p></div>
}

function StatusPill({ status }: { status: string }) {
  const lower = status.toLowerCase()
  const tone = lower.includes('complete') || lower.includes('approved') || lower.includes('working') || lower.includes('stored')
    ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
    : lower.includes('fail') || lower.includes('unavailable') || lower.includes('reject')
      ? 'border-red-300/20 bg-red-300/10 text-red-100'
      : 'border-amber-300/20 bg-amber-300/10 text-amber-100'
  return <span className={['rounded-full border px-2.5 py-1 text-[11px] font-black', tone].join(' ')}>{status}</span>
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-lg border border-slate-800 bg-slate-950/55 p-4 text-sm leading-7 text-slate-500">{text}</p>
}
