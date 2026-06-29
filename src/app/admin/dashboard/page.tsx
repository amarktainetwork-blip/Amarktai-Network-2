import type React from 'react'
import { AlertTriangle, AppWindow, Archive, Boxes, CheckCircle2, Database, HardDrive, Server, Zap } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'
import { getQueueStatus } from '@/lib/job-queue'
import { listRecords, LOCAL_STORE_FILES } from '@/lib/local-json-store'
import { verifyStorage } from '@/lib/storage-driver'
import { getVpsSnapshot } from '@/lib/vps-monitor'

export const dynamic = 'force-dynamic'

type LocalArtifact = { id: string; status?: string; title?: string; createdAt?: string }
type CommandJob = { id: string; prompt?: string; status?: string; createdAt?: string }

type OverviewSnapshot = {
  database: 'working' | 'failed'
  error: string | null
  connectedApps: number
  memoryEntries: number
  generatedAssets: number
  artifacts: number
  videoJobs: number
  failedAssets: Array<{ id: string; assetType: string; status: string; createdAt: Date }>
  failedVideoJobs: Array<{ id: string; prompt: string; status: string; createdAt: Date }>
}

export default async function OverviewPage() {
  const [runtime, queue, storage, vps, db] = await Promise.all([
    getDashboardRuntimeTruth().catch(() => null),
    getQueueStatus().catch(() => ({ healthy: false, backendAvailable: false, counts: {} as Record<string, number> })),
    verifyStorage().catch(() => null),
    getVpsSnapshot().catch(() => null),
    getOverviewSnapshot(),
  ])

  const localArtifacts = listRecords<LocalArtifact>(LOCAL_STORE_FILES.artifacts)
  const commandJobs = listRecords<CommandJob>('jobs/command-jobs.json')
  const localFailures = [
    ...localArtifacts.filter((item) => String(item.status ?? '').toLowerCase().includes('fail')).map((item) => ({
      id: item.id,
      title: item.title || 'Local artifact failure',
      status: item.status || 'failed',
    })),
    ...commandJobs.filter((item) => ['failed', 'blocked', 'error'].includes(String(item.status ?? '').toLowerCase())).map((item) => ({
      id: item.id,
      title: item.prompt || 'Command job failure',
      status: item.status || 'failed',
    })),
  ].slice(0, 6)

  const providers = runtime?.providers ?? []
  const providerSummary = {
    working: providers.filter((provider) => provider.connected).length,
    configured: providers.filter((provider) => provider.configured).length,
    total: providers.length,
  }
  const capabilities = runtime?.capabilities ?? []
  const capabilitySummary = {
    working: capabilities.filter((capability) => capability.status === 'working').length,
    needsProof: capabilities.filter((capability) => capability.status === 'needs_proof').length,
    blocked: capabilities.filter((capability) => capability.status === 'blocked').length,
    missing: capabilities.filter((capability) => capability.status === 'missing').length,
    total: capabilities.length,
  }
  const artifactCount = db.generatedAssets + db.artifacts + localArtifacts.length
  const activeJobCount = commandJobs.filter((job) => ['queued', 'running', 'processing', 'pending'].includes(String(job.status ?? '').toLowerCase())).length
  const criticalFailures = [
    ...db.failedAssets.map((asset) => ({ id: asset.id, title: asset.assetType, status: asset.status })),
    ...db.failedVideoJobs.map((job) => ({ id: job.id, title: job.prompt || 'Video job', status: job.status })),
    ...localFailures,
    ...(db.database === 'failed' ? [{ id: 'database', title: 'Database unavailable', status: 'failed' }] : []),
    ...(!storage?.writable ? [{ id: 'storage', title: 'Storage proof failed', status: 'failed' }] : []),
    ...(!queue.healthy ? [{ id: 'worker', title: 'Worker queue needs attention', status: queue.backendAvailable ? 'degraded' : 'unavailable' }] : []),
  ].slice(0, 8)

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-[#071019] p-6 lg:p-8">
        <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Overview</p>
        <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight text-white lg:text-5xl">
          Control centre summary
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400">
          A clean read on platform usage, connected apps, runtime readiness, jobs, assets, and critical failures. Detailed setup lives in Settings, System, and Capabilities.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<Server />} label="VPS / Webdock" value={vps?.host.hostname || 'Unverified'} detail={vps ? `${vps.host.memory.usedPercent}% memory used` : 'No VPS snapshot available'} tone={vps ? 'good' : 'warn'} />
        <Metric icon={<AppWindow />} label="Connected apps" value={String(db.connectedApps)} detail={`${db.memoryEntries} memory records`} tone={db.connectedApps > 0 ? 'good' : 'warn'} />
        <Metric icon={<Boxes />} label="Provider health" value={`${providerSummary.working}/${providerSummary.total}`} detail={`${providerSummary.configured} configured`} tone={providerSummary.working > 0 ? 'good' : 'warn'} />
        <Metric icon={<Zap />} label="Capabilities" value={`${capabilitySummary.working}/${capabilitySummary.total}`} detail={`${capabilitySummary.needsProof} needs proof, ${capabilitySummary.blocked} blocked, ${capabilitySummary.missing} missing`} tone={capabilitySummary.blocked === 0 ? 'good' : 'warn'} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Panel title="Usage Summary">
          <div className="grid gap-3 sm:grid-cols-2">
            <Fact icon={<Archive />} label="Assets and artifacts" value={String(artifactCount)} />
            <Fact icon={<HardDrive />} label="Storage" value={storage?.writable ? storage.driver : 'needs setup'} />
            <Fact icon={<Database />} label="Database" value={db.database} />
            <Fact icon={<ActivityIcon />} label="Active jobs" value={String(activeJobCount)} />
          </div>
        </Panel>

        <Panel title="Recent Critical Failures Only">
          {criticalFailures.length ? (
            <div className="space-y-2">
              {criticalFailures.map((failure) => (
                <div key={`${failure.id}-${failure.status}`} className="flex items-start justify-between gap-4 rounded-xl border border-red-300/15 bg-red-300/8 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-red-100">{failure.title}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-red-200/65">{failure.id}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-red-300/20 bg-red-300/10 px-2 py-1 text-[10px] font-black text-red-100">{failure.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/8 p-4">
              <div className="flex items-center gap-2 text-emerald-200">
                <CheckCircle2 className="h-4 w-4" />
                <p className="text-sm font-black">No critical failures reported.</p>
              </div>
            </div>
          )}
        </Panel>
      </section>

      {db.error && (
        <section className="rounded-2xl border border-amber-300/20 bg-amber-300/8 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" />
            <p className="text-sm leading-7 text-amber-100">Database summary is unavailable. Open System for diagnostics.</p>
          </div>
        </section>
      )}
    </div>
  )
}

async function getOverviewSnapshot(): Promise<OverviewSnapshot> {
  try {
    await prisma.$queryRaw`SELECT 1`
    const [connectedApps, memoryEntries, generatedAssets, artifacts, videoJobs, failedAssets, failedVideoJobs] = await Promise.all([
      prisma.appAiProfile.count(),
      prisma.memoryEntry.count(),
      prisma.generatedAsset.count(),
      prisma.artifact.count(),
      prisma.videoGenerationJob.count(),
      prisma.generatedAsset.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        where: { OR: [{ status: { contains: 'fail', mode: 'insensitive' } }, { approvalStatus: { contains: 'reject', mode: 'insensitive' } }] },
        select: { id: true, assetType: true, status: true, createdAt: true },
      }),
      prisma.videoGenerationJob.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        where: { status: { in: ['failed', 'blocked', 'error'] } },
        select: { id: true, prompt: true, status: true, createdAt: true },
      }),
    ])
    return { database: 'working', error: null, connectedApps, memoryEntries, generatedAssets, artifacts, videoJobs, failedAssets, failedVideoJobs }
  } catch (error) {
    return {
      database: 'failed',
      error: error instanceof Error ? error.message : 'Database unavailable',
      connectedApps: 0,
      memoryEntries: 0,
      generatedAssets: 0,
      artifacts: 0,
      videoJobs: 0,
      failedAssets: [],
      failedVideoJobs: [],
    }
  }
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
      <h2 className="text-lg font-black text-white">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Metric({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: 'good' | 'warn' }) {
  const toneClass = tone === 'good' ? 'text-emerald-300' : 'text-amber-200'
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
      <div className={`${toneClass} [&>svg]:h-5 [&>svg]:w-5`}>{icon}</div>
      <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-black text-white">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </div>
  )
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
      <div className="text-cyan-300 [&>svg]:h-4 [&>svg]:w-4">{icon}</div>
      <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-300">{value}</p>
    </div>
  )
}

function ActivityIcon() {
  return <Zap className="h-4 w-4" />
}
