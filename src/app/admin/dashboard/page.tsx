import Link from 'next/link'
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowRight,
  Bot,
  FileImage,
  ImageIcon,
  Music,
  Play,
  Video,
  Volume2,
} from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { OPERATOR_AGENTS } from '@/lib/agent-registry'
import { getDashboardRuntimeTruth, type DashboardRuntimeTruth, type ProviderRuntimeEntry } from '@/lib/runtime-capability-truth'
import { getQueueStatus } from '@/lib/job-queue'
import { listRecords, LOCAL_STORE_FILES } from '@/lib/local-json-store'
import { verifyStorage } from '@/lib/storage-driver'
import { getVpsSnapshot } from '@/lib/vps-monitor'

export const dynamic = 'force-dynamic'

const ACTIVE_PROVIDER_KEYS = ['genx', 'huggingface', 'together', 'groq', 'mimo'] as const

type LocalArtifact = {
  id: string
  title?: string
  type?: string
  status?: string
  storageUrl?: string
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

type DbSnapshot = {
  database: 'working' | 'failed'
  error: string | null
  counts: {
    campaigns: number
    campaignItems: number
    artifacts: number
    generatedAssets: number
    appProfiles: number
    memoryEntries: number
    videoJobs: number
  }
  campaigns: Array<{
    id: string
    name: string
    status: string
    goal: string
    budgetTier: string
    qualityTier: string
    approvalMode: string
    createdAt: Date
  }>
  assets: Array<{
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
  }>
  profiles: Array<{
    appSlug: string
    appName: string
    appType: string
    memoryNamespace: string
    retrievalNamespace: string
    safeMode: boolean
    adultMode: boolean
    updatedAt: Date
  }>
}

export default async function ControlCentrePage() {
  const [runtime, queue, storage, vps, db] = await Promise.all([
    getDashboardRuntimeTruth().catch(() => null),
    getQueueStatus().catch(() => ({ healthy: false, backendAvailable: false, counts: {} as Record<string, number> })),
    verifyStorage().catch((error) => ({
      driver: 'unknown',
      configured: false,
      persistent: false,
      basePath: '',
      requiredDriver: 'local_vps',
      requiredRoot: '',
      requiredDirectories: [] as readonly string[],
      missingSetup: ['Storage verification failed'],
      note: 'Storage verification failed',
      writable: false,
      directories: [],
      error: error instanceof Error ? error.message : 'Storage verification failed',
    })),
    getVpsSnapshot().catch(() => null),
    getDbSnapshot(),
  ])

  const localArtifacts = listRecords<LocalArtifact>(LOCAL_STORE_FILES.artifacts)
  const commandJobs = listRecords<CommandJob>('jobs/command-jobs.json')
  const recentJobs = [...commandJobs].slice(-5).reverse()
  const recentLocalArtifacts = [...localArtifacts].slice(-6).reverse()
  const providers = activeProviders(runtime)
  const warnings = buildWarnings(runtime, db, storage, queue)
  const artifactTotal = db.counts.artifacts + db.counts.generatedAssets + localArtifacts.length
  const activeAgents = OPERATOR_AGENTS.filter((agent) =>
    ['marketing-agent', 'adult-policy-agent', 'research-agent', 'app-operator-agent', 'memory-learning-agent', 'system-vps-agent'].includes(agent.id),
  )

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-cyan-300/15 bg-[#071019]">
        <div className="grid gap-8 p-6 lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Control Centre</p>
            <h1 className="mt-4 max-w-5xl text-3xl font-black tracking-tight text-white lg:text-5xl">
              Runtime operations for the central AI capability platform.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400">
              Apps request capabilities. Runtime owns provider routing, fallback, budget, quality, permissions, storage, memory, RAG, artifacts, approvals, and learning.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Signal label="Runtime health" value={runtime?.blockers.length ? 'Needs setup' : runtime ? 'Working' : 'Unavailable'} tone={runtime && runtime.blockers.length === 0 ? 'good' : 'warn'} />
            <Signal label="Database" value={db.database} tone={db.database === 'working' ? 'good' : 'bad'} />
            <Signal label="Storage" value={storage.writable ? storage.driver : 'failed'} tone={storage.writable ? 'good' : 'bad'} />
            <Signal label="Worker queue" value={queue.healthy ? 'working' : queue.backendAvailable ? 'degraded' : 'unavailable'} tone={queue.healthy ? 'good' : 'warn'} />
          </div>
        </div>
      </section>

      {warnings.length > 0 && (
        <section className="rounded-lg border border-amber-300/20 bg-amber-300/8 p-5">
          <div className="flex items-center gap-2 text-amber-200">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="text-sm font-black uppercase tracking-[0.16em]">Warnings and errors</h2>
          </div>
          <div className="mt-4 grid gap-2 lg:grid-cols-2">
            {warnings.slice(0, 8).map((warning) => (
              <p key={warning} className="rounded-lg border border-amber-300/15 bg-slate-950/40 px-3 py-2 text-xs leading-6 text-amber-100/85">{warning}</p>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<Activity />} label="Recent capability executions" value={String(recentJobs.length)} detail={`${commandJobs.length} command jobs tracked`} />
        <Metric icon={<Archive />} label="Artifacts" value={String(artifactTotal)} detail={`${db.counts.generatedAssets} generated assets, ${localArtifacts.length} local records`} />
        <Metric icon={<Play />} label="Campaigns" value={String(db.counts.campaigns)} detail={`${db.counts.campaignItems} campaign items`} />
        <Metric icon={<Bot />} label="Agent activity" value={String(activeAgents.length)} detail={`${db.counts.memoryEntries} memory records`} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Panel title="Capability Console" label="Request setup">
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="App context">
              <select className="control-input">
                {db.profiles.length > 0 ? db.profiles.map((profile) => (
                  <option key={profile.appSlug}>{profile.appName} ({profile.appSlug})</option>
                )) : <option>No app profiles found</option>}
              </select>
            </Field>
            <Field label="Workspace">
              <select className="control-input">
                <option>Default workspace</option>
                <option>Marketing workspace</option>
                <option>Creator workspace</option>
              </select>
            </Field>
            <Field label="Brand context">
              <select className="control-input">
                <option>Use selected app brand memory</option>
                <option>No brand selected</option>
              </select>
            </Field>
            <Field label="Capability">
              <select className="control-input">
                {['Text / Chat', 'Research', 'Image', 'Video', 'Music', 'Audio', 'Avatar', 'Document', 'Agent task'].map((capability) => (
                  <option key={capability}>{capability}</option>
                ))}
              </select>
            </Field>
            <Field label="Budget tier">
              <select className="control-input">
                <option>Balanced</option>
                <option>Economy</option>
                <option>Premium</option>
              </select>
            </Field>
            <Field label="Quality tier">
              <select className="control-input">
                <option>Standard</option>
                <option>Fast preview</option>
                <option>High quality</option>
              </select>
            </Field>
          </div>
          <Field label="Request input">
            <textarea className="control-input min-h-28 resize-y" placeholder="Describe the capability request. Provider and model are selected by runtime after validation." />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <label className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold ${runtime?.adultGate.status === 'ready' ? 'border-cyan-300/20 bg-cyan-300/8 text-cyan-100' : 'border-slate-700 bg-slate-950/60 text-slate-500'}`}>
              <input type="checkbox" disabled={runtime?.adultGate.status !== 'ready'} />
              Adult mode permitted by selected app
            </label>
            <Link href="/admin/dashboard/studio" className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2.5 text-xs font-black text-slate-950 transition hover:bg-cyan-300">
              Run in Studio <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="text-xs leading-6 text-slate-500">No provider or model selector is exposed. Runtime-selected provider/model appears only after execution proof exists.</p>
        </Panel>

        <Panel title="Run Preview and Proof" label="No fake output">
          <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-4">
            <p className="text-sm font-black text-white">Awaiting execution</p>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              This panel stays empty until a real capability run creates an artifact, route proof, or failure. Use Studio or a workflow page to execute.
            </p>
          </div>
          <div className="grid gap-2">
            <ProofRow label="Selected provider" value="Shown after execution" />
            <ProofRow label="Selected model" value="Shown after execution" />
            <ProofRow label="Fallback used" value="Shown after execution" />
            <ProofRow label="Artifact link" value="Shown after storage" />
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Panel title="App Context" label="Memory and retrieval">
          <div className="space-y-3">
            {db.profiles.length > 0 ? db.profiles.slice(0, 5).map((profile) => (
              <div key={profile.appSlug} className="rounded-lg border border-slate-700 bg-slate-950/55 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-white">{profile.appName}</p>
                  <StatusBadge value={profile.safeMode ? 'safe_mode' : 'custom_policy'} />
                </div>
                <p className="mt-1 text-xs text-slate-500">{profile.appSlug} - {profile.appType}</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] font-bold uppercase tracking-wide">
                  <MiniState label="Memory" ok={Boolean(profile.memoryNamespace)} />
                  <MiniState label="RAG" ok={Boolean(profile.retrievalNamespace)} />
                  <MiniState label="Adult" ok={profile.adultMode} />
                </div>
              </div>
            )) : <EmptyState text={db.database === 'working' ? 'No app profiles found.' : 'Database unavailable, app profiles cannot be loaded.'} />}
          </div>
        </Panel>

        <Panel title="Campaigns" label="Marketing workflow">
          <div className="space-y-3">
            {db.campaigns.length > 0 ? db.campaigns.map((campaign) => (
              <div key={campaign.id} className="rounded-lg border border-slate-700 bg-slate-950/55 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-black text-white">{campaign.name}</p>
                  <StatusBadge value={campaign.status} />
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-6 text-slate-500">{campaign.goal || 'No campaign goal stored.'}</p>
                <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">{campaign.budgetTier} budget - {campaign.qualityTier} quality - {campaign.approvalMode}</p>
              </div>
            )) : <EmptyState text={db.database === 'working' ? 'No campaigns found.' : 'Database unavailable, campaigns cannot be loaded.'} />}
          </div>
        </Panel>

        <Panel title="Agents" label="Learning summary">
          <div className="space-y-3">
            {activeAgents.map((agent) => (
              <div key={agent.id} className="rounded-lg border border-slate-700 bg-slate-950/55 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-white">{agent.name}</p>
                  <StatusBadge value={agent.costMode} />
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-6 text-slate-500">{agent.purpose}</p>
                <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-cyan-300">{agent.allowedCapabilities.slice(0, 4).join(', ')}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel title="Assets" label="Generated and stored artifacts">
          <div className="grid gap-3 md:grid-cols-2">
            {assetRows(db.assets, recentLocalArtifacts).length > 0 ? assetRows(db.assets, recentLocalArtifacts).map((asset) => (
              <div key={asset.id} className="rounded-lg border border-slate-700 bg-slate-950/55 p-3">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-700 bg-slate-900 text-cyan-300">
                    {assetIcon(asset.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-black text-white">{asset.title}</p>
                      <StatusBadge value={asset.status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{asset.type}</p>
                    {asset.href ? <a href={asset.href} className="mt-2 inline-flex text-xs font-bold text-cyan-300 hover:text-cyan-200">Open reference</a> : <p className="mt-2 text-xs text-slate-600">No artifact link stored.</p>}
                  </div>
                </div>
              </div>
            )) : <EmptyState text="No generated assets or local artifacts found." />}
          </div>
        </Panel>

        <Panel title="Providers" label="Active provider set only">
          <div className="space-y-3">
            {providers.map((provider) => (
              <div key={provider.key} className="rounded-lg border border-slate-700 bg-slate-950/55 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-white">{provider.displayName}</p>
                  <StatusBadge value={providerDisplayStatus(provider)} />
                </div>
                <p className="mt-2 text-xs leading-6 text-slate-500">{provider.reason || 'No provider status message returned.'}</p>
              </div>
            ))}
          </div>
          <p className="text-xs leading-6 text-slate-500">Removed providers are not displayed as active providers.</p>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Panel title="System" label="Database, storage, services">
          <div className="space-y-2">
            <ProofRow label="Database" value={db.database} />
            <ProofRow label="Storage driver" value={storage.driver} />
            <ProofRow label="Artifact proof" value={storage.writable ? 'writable' : storage.error ?? 'not writable'} />
            <ProofRow label="Platform service" value={vps?.services.node?.status ?? 'unverified'} />
            <ProofRow label="Worker" value={queue.healthy ? 'queue healthy' : queue.backendAvailable ? 'queue degraded' : 'queue unavailable'} />
          </div>
        </Panel>
        <Panel title="VPS Health" label="Real probes or unverified">
          <div className="space-y-2">
            <ProofRow label="Host" value={vps ? `${vps.host.platform} ${vps.host.release}` : 'unverified'} />
            <ProofRow label="Memory" value={vps ? `${vps.host.memory.usedPercent}% used` : 'unverified'} />
            <ProofRow label="Postgres" value={serviceValue(vps?.services.postgres)} />
            <ProofRow label="Redis" value={serviceValue(vps?.services.redis)} />
            <ProofRow label="Qdrant" value={serviceValue(vps?.services.qdrant)} />
          </div>
        </Panel>
        <Panel title="Recent Executions" label="Capability activity">
          <div className="space-y-3">
            {recentJobs.length > 0 ? recentJobs.map((job) => (
              <div key={job.id} className="rounded-lg border border-slate-700 bg-slate-950/55 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-black text-white">{job.prompt || job.id}</p>
                  <StatusBadge value={job.status || 'unknown'} />
                </div>
                <p className="mt-2 text-xs text-slate-500">{job.route?.surface || job.route?.intent || 'Capability execution'}</p>
              </div>
            )) : <EmptyState text="No recent capability executions found." />}
          </div>
        </Panel>
      </section>
    </div>
  )
}

async function getDbSnapshot(): Promise<DbSnapshot> {
  const empty: DbSnapshot = {
    database: 'failed',
    error: null,
    counts: { campaigns: 0, campaignItems: 0, artifacts: 0, generatedAssets: 0, appProfiles: 0, memoryEntries: 0, videoJobs: 0 },
    campaigns: [],
    assets: [],
    profiles: [],
  }

  try {
    await prisma.$queryRaw`SELECT 1`
    const [campaigns, campaignItems, artifacts, generatedAssets, appProfiles, memoryEntries, videoJobs, recentCampaigns, recentAssets, profiles] = await Promise.all([
      prisma.campaign.count(),
      prisma.campaignItem.count(),
      prisma.artifact.count(),
      prisma.generatedAsset.count(),
      prisma.appAiProfile.count(),
      prisma.memoryEntry.count(),
      prisma.videoGenerationJob.count(),
      prisma.campaign.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, status: true, goal: true, budgetTier: true, qualityTier: true, approvalMode: true, createdAt: true },
      }),
      prisma.generatedAsset.findMany({
        take: 8,
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
      prisma.appAiProfile.findMany({
        take: 6,
        orderBy: { updatedAt: 'desc' },
        select: {
          appSlug: true,
          appName: true,
          appType: true,
          memoryNamespace: true,
          retrievalNamespace: true,
          safeMode: true,
          adultMode: true,
          updatedAt: true,
        },
      }),
    ])

    return {
      database: 'working',
      error: null,
      counts: { campaigns, campaignItems, artifacts, generatedAssets, appProfiles, memoryEntries, videoJobs },
      campaigns: recentCampaigns,
      assets: recentAssets,
      profiles,
    }
  } catch (error) {
    return { ...empty, error: error instanceof Error ? error.message : 'Database check failed' }
  }
}

function activeProviders(runtime: DashboardRuntimeTruth | null): ProviderRuntimeEntry[] {
  const rows = runtime?.providers ?? []
  return ACTIVE_PROVIDER_KEYS.map((key) => rows.find((provider) => provider.key === key)).filter(Boolean) as ProviderRuntimeEntry[]
}

function buildWarnings(
  runtime: DashboardRuntimeTruth | null,
  db: DbSnapshot,
  storage: { writable: boolean; error: string | null; missingSetup?: string[] },
  queue: { healthy: boolean; backendAvailable: boolean },
) {
  return [
    ...(!runtime ? ['Runtime truth could not be loaded.'] : runtime.blockers.slice(0, 5)),
    ...(db.database === 'failed' ? [`Database failed: ${db.error ?? 'unavailable'}`] : []),
    ...(!storage.writable ? [`Storage not writable: ${storage.error ?? storage.missingSetup?.join(', ') ?? 'unavailable'}`] : []),
    ...(!queue.healthy ? ['Worker queue is not fully healthy. Heavy media jobs must remain gated.'] : []),
  ]
}

function providerDisplayStatus(provider: ProviderRuntimeEntry) {
  if (provider.connected) return 'working'
  if (!provider.configured) return 'unconfigured'
  if (provider.status === 'configured_not_wired') return 'requires_verification'
  if (provider.status === 'blocked') return 'failed'
  return provider.status
}

function assetRows(dbAssets: DbSnapshot['assets'], localArtifacts: LocalArtifact[]) {
  const db = dbAssets.map((asset) => ({
    id: asset.id,
    title: asset.assetType,
    type: asset.assetType,
    status: asset.approvalStatus || asset.status,
    href: asset.resultUrl ?? asset.thumbnailUrl ?? (asset.resultFilePath ? `/api/artifacts/file/${asset.resultFilePath}` : ''),
  }))
  const local = localArtifacts.map((artifact) => ({
    id: artifact.id,
    title: artifact.title || artifact.id,
    type: artifact.type || 'artifact',
    status: artifact.status || 'stored',
    href: artifact.storageUrl || artifact.url || artifact.path || '',
  }))
  return [...db, ...local].slice(0, 8)
}

function serviceValue(service: { available?: boolean; output?: string; status?: string; version?: string } | undefined) {
  if (!service) return 'unverified'
  if ('available' in service) return service.available ? 'available' : 'unavailable'
  return service.status || service.version || 'unverified'
}

function assetIcon(type: string) {
  const iconClass = 'h-5 w-5'
  if (type.includes('video')) return <Video className={iconClass} />
  if (type.includes('music')) return <Music className={iconClass} />
  if (type.includes('audio') || type.includes('voice')) return <Volume2 className={iconClass} />
  if (type.includes('image')) return <ImageIcon className={iconClass} />
  return <FileImage className={iconClass} />
}

function Panel({ title, label, children }: { title: string; label: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/55 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-white">{title}</h2>
        <span className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">{label}</span>
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  )
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/55 p-5">
      <div className="text-cyan-300 [&>svg]:h-5 [&>svg]:w-5">{icon}</div>
      <p className="mt-4 text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-black text-white">{value}</p>
      <p className="mt-2 text-xs text-slate-600">{detail}</p>
    </div>
  )
}

function Signal({ label, value, tone }: { label: string; value: string; tone: 'good' | 'warn' | 'bad' }) {
  const toneClass = tone === 'good' ? 'text-emerald-300' : tone === 'warn' ? 'text-amber-300' : 'text-red-300'
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className={`mt-2 text-lg font-black capitalize ${toneClass}`}>{value}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>
      {children}
    </label>
  )
}

function ProofRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-950/55 px-3 py-2">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <span className="text-right text-xs font-black text-slate-200">{value}</span>
    </div>
  )
}

function StatusBadge({ value }: { value: string }) {
  const normalized = value.toLowerCase()
  const good = ['working', 'completed', 'approved', 'published', 'ready', 'balanced', 'cheap'].includes(normalized)
  const bad = ['failed', 'blocked', 'rejected', 'unsupported'].includes(normalized)
  const className = good
    ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200'
    : bad
      ? 'border-red-300/20 bg-red-300/10 text-red-200'
      : 'border-amber-300/20 bg-amber-300/10 text-amber-200'
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${className}`}>{value.replace(/_/g, ' ')}</span>
}

function MiniState({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span className={`rounded border px-2 py-1 text-center ${ok ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200' : 'border-slate-700 bg-slate-950/70 text-slate-600'}`}>
      {label}
    </span>
  )
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-lg border border-slate-800 bg-slate-950/55 p-4 text-sm text-slate-500">{text}</p>
}
