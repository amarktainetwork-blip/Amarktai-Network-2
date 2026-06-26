import type React from 'react'
import { Bot, Database, FolderOpen, Lock, RadioTower } from 'lucide-react'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type AppRow = {
  appSlug: string
  appName: string
  appType: string
  domain: string
  costMode: string
  routingStrategy: string
  safeMode: boolean
  adultMode: boolean
  suggestiveMode: boolean
  enabledCapabilities: string
  memoryNamespace: string
  retrievalNamespace: string
}

type Snapshot = {
  connected: boolean
  error: string | null
  profiles: AppRow[]
  counts: Record<string, { memory: number; campaigns: number; assets: number; artifacts: number; videoJobs: number }>
}

async function getSnapshot(): Promise<Snapshot> {
  try {
    const profiles = await prisma.appAiProfile.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        appSlug: true,
        appName: true,
        appType: true,
        domain: true,
        costMode: true,
        routingStrategy: true,
        safeMode: true,
        adultMode: true,
        suggestiveMode: true,
        enabledCapabilities: true,
        memoryNamespace: true,
        retrievalNamespace: true,
      },
    })

    const counts: Snapshot['counts'] = {}
    await Promise.all(profiles.map(async (profile) => {
      const [memory, campaigns, assets, artifacts, videoJobs] = await Promise.all([
        prisma.memoryEntry.count({ where: { appSlug: profile.appSlug } }).catch(() => 0),
        prisma.campaign.count({ where: { appSlug: profile.appSlug } }).catch(() => 0),
        prisma.generatedAsset.count({ where: { appSlug: profile.appSlug } }).catch(() => 0),
        prisma.artifact.count({ where: { appSlug: profile.appSlug } }).catch(() => 0),
        prisma.videoGenerationJob.count({ where: { appSlug: profile.appSlug } }).catch(() => 0),
      ])
      counts[profile.appSlug] = { memory, campaigns, assets, artifacts, videoJobs }
    }))

    return { connected: true, error: null, profiles, counts }
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Database not connected',
      profiles: [],
      counts: {},
    }
  }
}

export default async function NetworkAppsPage() {
  const snapshot = await getSnapshot()

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-700/50 bg-slate-900/70 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">Connected Apps</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">App capability control surface</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
              Real app profiles from <span className="font-mono text-slate-300">app_ai_profiles</span>. If the database is unavailable, this page stays honest and marks app data as not connected.
            </p>
          </div>
          <StatusPill status={snapshot.connected ? 'connected' : 'not connected'} />
        </div>
        {!snapshot.connected && (
          <p className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-sm font-bold text-amber-300">
            Database not connected: {snapshot.error ?? 'unverified'}
          </p>
        )}
      </section>

      {snapshot.profiles.length === 0 ? (
        <EmptyApps connected={snapshot.connected} />
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {snapshot.profiles.map((profile) => {
            const counts = snapshot.counts[profile.appSlug] ?? { memory: 0, campaigns: 0, assets: 0, artifacts: 0, videoJobs: 0 }
            const capabilities = parseList(profile.enabledCapabilities)
            return (
              <article key={profile.appSlug} className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-xl font-black text-slate-100">{profile.appName || profile.appSlug}</h2>
                    <p className="mt-1 font-mono text-xs text-slate-500">{profile.appSlug}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{profile.appType} / {profile.domain}</p>
                  </div>
                  <StatusPill status={capabilities.length ? 'active' : 'unverified'} />
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <Fact icon={<FolderOpen />} label="Budget" value={profile.costMode || 'balanced'} />
                  <Fact icon={<RadioTower />} label="Quality" value={profile.routingStrategy || 'balanced'} />
                  <Fact icon={<Lock />} label="Adult permission" value={profile.adultMode && !profile.safeMode ? 'enabled' : profile.suggestiveMode ? 'suggestive only' : 'disabled'} />
                  <Fact icon={<Database />} label="Memory" value={profile.memoryNamespace || counts.memory ? `${counts.memory} entries` : 'not connected'} />
                  <Fact icon={<Database />} label="RAG" value={profile.retrievalNamespace ? 'namespace set' : 'unverified'} />
                  <Fact icon={<Bot />} label="Recent runs" value={`${counts.assets + counts.artifacts + counts.videoJobs} outputs/jobs`} />
                </div>

                <div className="mt-4 rounded-xl border border-slate-700/40 bg-slate-950/40 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Enabled capabilities</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(capabilities.length ? capabilities : ['not connected']).map((capability) => (
                      <span key={capability} className="rounded-lg border border-slate-700/50 bg-slate-800/60 px-2 py-1 text-xs font-bold text-slate-300">{capability}</span>
                    ))}
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-slate-700/40 bg-slate-950/40 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">What this app can request</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {capabilities.length
                      ? capabilities.join(', ')
                      : 'No enabled capability list is stored yet. App requests should remain blocked or unverified until capabilities are configured.'}
                  </p>
                </div>
              </article>
            )
          })}
        </section>
      )}
    </div>
  )
}

function parseList(value: string): string[] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : []
  } catch {
    return value ? value.split(',').map((item) => item.trim()).filter(Boolean) : []
  }
}

function EmptyApps({ connected }: { connected: boolean }) {
  return (
    <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-10 text-center">
      <FolderOpen className="mx-auto h-10 w-10 text-slate-600" />
      <h2 className="mt-4 text-xl font-black text-slate-200">No connected apps found</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
        {connected
          ? 'The database is connected, but no app AI profiles exist yet.'
          : 'App profiles are not connected because the database could not be reached.'}
      </p>
    </section>
  )
}

function Fact({ icon, label, value }: { icon: React.ReactElement; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-700/40 bg-slate-950/40 p-3">
      <span className="text-cyan-300 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-300">{value}</p>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const tone = status === 'connected' || status === 'active'
    ? 'border-emerald-500/20 bg-emerald-500/8 text-emerald-300'
    : status === 'not connected'
      ? 'border-red-500/20 bg-red-500/8 text-red-300'
      : 'border-amber-500/20 bg-amber-500/8 text-amber-300'
  return <span className={['rounded-full border px-3 py-1 text-xs font-black', tone].join(' ')}>{status}</span>
}
