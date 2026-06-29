import type React from 'react'
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Database,
  HardDrive,
  Link2,
  Server,
  Zap,
} from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'
import { getCapabilityRuntimeTruth } from '@/lib/capability-runtime-truth'
import { getQueueStatus } from '@/lib/job-queue'
import { listRecords, LOCAL_STORE_FILES } from '@/lib/local-json-store'
import { verifyStorage } from '@/lib/storage-driver'
import { getVpsSnapshot } from '@/lib/vps-monitor'

export const dynamic = 'force-dynamic'

type LocalArtifact = { id: string; status?: string; title?: string }
type CommandJob = { id: string; prompt?: string; status?: string }

const NAV_LINKS = [
  { label: 'Command Center', href: '/admin/dashboard' },
  { label: 'Studio', href: '/admin/dashboard/studio' },
  { label: 'Capabilities', href: '/admin/dashboard/capabilities' },
  { label: 'Providers & Models', href: '/admin/dashboard/providers' },
  { label: 'Proof & Tests', href: '/admin/dashboard/proof' },
  { label: 'Assets & Jobs', href: '/admin/dashboard/assets' },
  { label: 'Memory & Knowledge', href: '/admin/dashboard/memory' },
  { label: 'Automation', href: '/admin/dashboard/automation' },
  { label: 'Adult Private', href: '/admin/dashboard/adult' },
  { label: 'App Runtime', href: '/admin/dashboard/app-runtime' },
  { label: 'Libraries & Integrations', href: '/admin/dashboard/libraries' },
  { label: 'Settings', href: '/admin/dashboard/settings' },
  { label: 'System', href: '/admin/dashboard/system' },
]

export default async function CommandCenterPage() {
  const [runtime, capabilityTruth, queue, storage, vps] = await Promise.all([
    getDashboardRuntimeTruth().catch(() => null),
    getCapabilityRuntimeTruth().catch(() => []),
    getQueueStatus().catch(() => ({ healthy: false, backendAvailable: false, counts: {} as Record<string, number> })),
    verifyStorage().catch(() => null),
    getVpsSnapshot().catch(() => null),
  ])

  // Database check
  let dbStatus: 'working' | 'failed' = 'failed'
  let dbError: string | null = null
  try {
    await prisma.$queryRaw`SELECT 1`
    dbStatus = 'working'
  } catch (err) {
    dbError = err instanceof Error ? err.message : 'Database unavailable'
  }

  // Failures from local store
  const localArtifacts = listRecords<LocalArtifact>(LOCAL_STORE_FILES.artifacts)
  const commandJobs = listRecords<CommandJob>('jobs/command-jobs.json')
  const localFailures = [
    ...localArtifacts
      .filter((item) => String(item.status ?? '').toLowerCase().includes('fail'))
      .map((item) => ({ id: item.id, title: item.title || 'Local artifact failure', status: item.status || 'failed' })),
    ...commandJobs
      .filter((item) => ['failed', 'blocked', 'error'].includes(String(item.status ?? '').toLowerCase()))
      .map((item) => ({ id: item.id, title: item.prompt || 'Command job failure', status: item.status || 'failed' })),
  ]

  // DB failures
  let dbFailedAssets: Array<{ id: string; title: string; status: string }> = []
  let dbFailedVideoJobs: Array<{ id: string; title: string; status: string }> = []
  if (dbStatus === 'working') {
    try {
      const [assets, videos] = await Promise.all([
        prisma.generatedAsset.findMany({
          take: 4,
          orderBy: { createdAt: 'desc' },
          where: { OR: [{ status: { contains: 'fail', mode: 'insensitive' } }, { approvalStatus: { contains: 'reject', mode: 'insensitive' } }] },
          select: { id: true, assetType: true, status: true },
        }),
        prisma.videoGenerationJob.findMany({
          take: 4,
          orderBy: { createdAt: 'desc' },
          where: { status: { in: ['failed', 'blocked', 'error'] } },
          select: { id: true, prompt: true, status: true },
        }),
      ])
      dbFailedAssets = assets.map((a) => ({ id: a.id, title: a.assetType, status: a.status }))
      dbFailedVideoJobs = videos.map((v) => ({ id: v.id, title: v.prompt || 'Video job', status: v.status }))
    } catch {
      // non-fatal
    }
  }

  // Derived counts
  const providers = runtime?.providers ?? []
  const connectedProviders = providers.filter((p) => p.connected).length
  const totalProviders = providers.length

  const capWorking = capabilityTruth.filter((c) => c.status === 'working').length
  // wired_unproven = needs proof: not yet live-tested, needs real proof run
  const capNeedsProof = capabilityTruth.filter((c) => c.status === 'wired_unproven').length
  const capBlocked = capabilityTruth.filter((c) => c.status === 'blocked').length
  const capMissing = capabilityTruth.filter((c) => c.status === 'missing').length
  const capTotal = capabilityTruth.length

  const activeJobCount = (queue.counts?.queued ?? 0) + (queue.counts?.running ?? 0) + (queue.counts?.processing ?? 0) + (queue.counts?.pending ?? 0)

  // Blockers
  const blockers = runtime?.blockers ?? []
  const systemBlockers = [
    ...(dbStatus === 'failed' ? ['Database unavailable'] : []),
    ...(!storage?.writable ? ['Storage not writable'] : []),
    ...(!queue.healthy ? [`Worker queue ${queue.backendAvailable ? 'degraded' : 'backend unavailable'}`] : []),
  ]
  const allBlockers = [...blockers, ...systemBlockers]

  // Recent failures
  const recentFailures = [
    ...dbFailedAssets,
    ...dbFailedVideoJobs,
    ...localFailures,
    ...(dbStatus === 'failed' ? [{ id: 'db', title: 'Database unavailable', status: 'failed' }] : []),
    ...(!storage?.writable ? [{ id: 'storage', title: 'Storage proof failed', status: 'failed' }] : []),
    ...(!queue.healthy ? [{ id: 'worker', title: 'Worker queue needs attention', status: queue.backendAvailable ? 'degraded' : 'unavailable' }] : []),
  ].slice(0, 8)

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-2xl border border-slate-800 bg-[#071019] p-6 lg:p-8">
        <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Admin</p>
        <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight text-white lg:text-5xl">
          Command Center
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400">
          AmarktAI Network control surface
        </p>
      </section>

      {/* Metric strip */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          icon={<Server />}
          label="Provider health"
          value={`${connectedProviders}/${totalProviders}`}
          detail={connectedProviders > 0 ? `${connectedProviders} connected` : 'None connected'}
          tone={connectedProviders > 0 ? 'good' : 'warn'}
        />
        <MetricCard
          icon={<Zap />}
          label="Capabilities"
          value={`${capWorking}/${capTotal}`}
          detail={`${capNeedsProof} needs proof · ${capBlocked} blocked · ${capMissing} missing`}
          tone={capWorking > 0 ? 'good' : 'warn'}
        />
        <MetricCard
          icon={<HardDrive />}
          label="Storage"
          value={storage?.writable ? storage.driver : 'not writable'}
          detail={storage?.writable ? 'Writable' : 'Storage check failed'}
          tone={storage?.writable ? 'good' : 'warn'}
        />
        <MetricCard
          icon={<Archive />}
          label="Active jobs"
          value={String(activeJobCount)}
          detail={queue.healthy ? 'Queue healthy' : 'Queue needs attention'}
          tone={queue.healthy ? 'good' : 'warn'}
        />
        <MetricCard
          icon={<Database />}
          label="Database"
          value={dbStatus}
          detail={dbStatus === 'working' ? 'Connected' : (dbError ?? 'Unavailable')}
          tone={dbStatus === 'working' ? 'good' : 'warn'}
        />
      </section>

      {/* Blockers + Provider readiness */}
      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Blockers">
          {allBlockers.length > 0 ? (
            <div className="space-y-2">
              {allBlockers.map((blocker, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-amber-300/15 bg-amber-300/8 px-3 py-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  <p className="text-sm text-amber-100">{blocker}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/8 p-4">
              <div className="flex items-center gap-2 text-emerald-200">
                <CheckCircle2 className="h-4 w-4" />
                <p className="text-sm font-black">No blockers detected.</p>
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Provider readiness">
          <div className="space-y-2">
            {providers.length > 0 ? providers.map((p) => (
              <div key={p.key} className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/55 px-3 py-2">
                <span className="text-sm text-slate-300">{p.displayName}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${p.connected ? 'border border-emerald-300/20 bg-emerald-300/10 text-emerald-200' : p.configured ? 'border border-amber-300/20 bg-amber-300/10 text-amber-200' : 'border border-slate-700 bg-slate-900 text-slate-500'}`}>
                  {p.connected ? 'connected' : p.configured ? 'configured' : 'missing'}
                </span>
              </div>
            )) : (
              <p className="text-sm text-slate-500">No providers found.</p>
            )}
          </div>
        </Panel>
      </section>

      {/* Capability status + System health */}
      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Capability status summary">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatBox label="Working" value={capWorking} tone="good" />
            <StatBox label="Needs proof" value={capNeedsProof} tone="neutral" />
            <StatBox label="Blocked" value={capBlocked} tone="warn" />
            <StatBox label="Missing" value={capMissing} tone="bad" />
          </div>
        </Panel>

        <Panel title="System health">
          <div className="space-y-2">
            <HealthRow label="VPS" value={vps ? `${vps.host.hostname} · ${vps.host.memory.usedPercent}% mem` : 'No snapshot available'} healthy={Boolean(vps)} />
            <HealthRow label="Worker" value={queue.healthy ? `${activeJobCount} active jobs` : 'Queue unhealthy'} healthy={queue.healthy} />
            <HealthRow label="Storage" value={storage?.writable ? `${storage.driver} writable` : 'Not writable'} healthy={Boolean(storage?.writable)} />
            <HealthRow label="Database" value={dbStatus === 'working' ? 'Connected' : (dbError ?? 'Unavailable')} healthy={dbStatus === 'working'} />
          </div>
        </Panel>
      </section>

      {/* Recent failures */}
      <Panel title="Recent failures">
        {recentFailures.length > 0 ? (
          <div className="space-y-2">
            {recentFailures.map((f) => (
              <div key={`${f.id}-${f.status}`} className="flex items-start justify-between gap-4 rounded-xl border border-red-300/15 bg-red-300/8 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-red-100">{f.title}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-red-200/65">{f.id}</p>
                </div>
                <span className="shrink-0 rounded-full border border-red-300/20 bg-red-300/10 px-2 py-1 text-[10px] font-black text-red-100">{f.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/8 p-4">
            <div className="flex items-center gap-2 text-emerald-200">
              <CheckCircle2 className="h-4 w-4" />
              <p className="text-sm font-black">No recent failures.</p>
            </div>
          </div>
        )}
      </Panel>

      {/* Quick navigation */}
      <Panel title="Quick navigation">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/55 px-3 py-2 text-sm text-slate-300 transition-colors hover:border-cyan-700/50 hover:text-cyan-300"
            >
              <Link2 className="h-3.5 w-3.5 shrink-0 text-cyan-500" />
              {link.label}
            </a>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
      <h2 className="text-lg font-black text-white">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function MetricCard({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: 'good' | 'warn' }) {
  const toneClass = tone === 'good' ? 'text-emerald-300' : 'text-amber-200'
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
      <div className={`${toneClass} [&>svg]:h-5 [&>svg]:w-5`}>{icon}</div>
      <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </div>
  )
}

function StatBox({ label, value, tone }: { label: string; value: number; tone: 'good' | 'neutral' | 'warn' | 'bad' }) {
  const toneClass =
    tone === 'good' ? 'text-emerald-300' :
    tone === 'warn' ? 'text-amber-200' :
    tone === 'bad' ? 'text-red-300' :
    'text-slate-400'
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-3 text-center">
      <p className={`text-2xl font-black ${toneClass}`}>{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  )
}

function HealthRow({ label, value, healthy }: { label: string; value: string; healthy: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/55 px-3 py-2">
      <span className="text-sm font-bold text-slate-400">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className="truncate text-right text-sm text-slate-300">{value}</span>
        <span className={`shrink-0 h-2 w-2 rounded-full ${healthy ? 'bg-emerald-400' : 'bg-amber-400'}`} />
      </div>
    </div>
  )
}
