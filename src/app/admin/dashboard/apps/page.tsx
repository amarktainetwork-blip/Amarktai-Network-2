import type React from 'react'
import { Bot, Database, FolderOpen, HeartPulse, Megaphone, ShieldCheck, Workflow } from 'lucide-react'
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
  enabledCapabilities: string
  memoryNamespace: string
  retrievalNamespace: string
}

type Usage = { memory: number; campaigns: number; assets: number; artifacts: number; videoJobs: number }
type Snapshot = { connected: boolean; error: string | null; profiles: AppRow[]; counts: Record<string, Usage> }

const plannedApps = [
  {
    slug: 'marketing',
    name: 'Marketing App',
    icon: Megaphone,
    context: 'Brand identity, website scrape, campaign memory, generated assets, approval state.',
    requests: 'Campaign workflow, research, image, video, music, document, publishing jobs.',
  },
  {
    slug: 'adult-companion',
    name: 'Adult Companion App',
    icon: Bot,
    context: 'Persona, voice, avatar, memory, safety gates, consent and rights checks.',
    requests: 'Policy-gated text, image, avatar, voice, memory, and app-scoped retrieval.',
  },
  {
    slug: 'horse',
    name: 'Horse App',
    icon: HeartPulse,
    context: 'Horse profiles, health history, owner notes, documents, research, care knowledge.',
    requests: 'Research, RAG, document analysis, reminders, customer service, and planning.',
  },
] as const

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
    return { connected: false, error: error instanceof Error ? error.message : 'Database unavailable', profiles: [], counts: {} }
  }
}

export default async function AppsPage() {
  const snapshot = await getSnapshot()

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-cyan-300/15 bg-[#071019] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Apps</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white">Thin apps powered by one runtime</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
              Apps keep their own context, memory, and workflow intent. The platform chooses providers, capabilities, jobs, artifacts, permissions, and storage.
            </p>
          </div>
          <StatusPill status={snapshot.connected ? 'database connected' : 'database unavailable'} />
        </div>
        {!snapshot.connected && (
          <p className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/8 px-3 py-2 text-sm font-bold text-amber-200">
            App usage is unavailable: {snapshot.error ?? 'database check failed'}
          </p>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {plannedApps.map(({ slug, name, icon: Icon, context, requests }) => {
          const profile = findProfile(snapshot.profiles, slug)
          const usage = profile ? snapshot.counts[profile.appSlug] ?? emptyUsage() : emptyUsage()
          return (
            <article key={slug} className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg border border-cyan-300/15 bg-cyan-300/8 text-cyan-300">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-black text-white">{name}</h2>
                    <p className="font-mono text-[11px] text-slate-500">{profile?.appSlug ?? slug}</p>
                  </div>
                </div>
                <StatusPill status={profile ? 'connected' : 'planned'} />
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-400">{context}</p>
              <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Requests from platform</p>
                <p className="mt-2 text-xs leading-6 text-slate-400">{requests}</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Fact icon={<Database />} label="Memory" value={String(usage.memory)} />
                <Fact icon={<Workflow />} label="Jobs/assets" value={String(usage.assets + usage.artifacts + usage.videoJobs)} />
                <Fact icon={<FolderOpen />} label="Campaigns" value={String(usage.campaigns)} />
                <Fact icon={<ShieldCheck />} label="Policy" value={profile?.safeMode ? 'safe mode' : profile?.adultMode ? 'gated' : 'standard'} />
              </div>
            </article>
          )
        })}
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="text-lg font-black text-white">Connected app profiles</h2>
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {snapshot.profiles.length ? snapshot.profiles.map((profile) => {
            const usage = snapshot.counts[profile.appSlug] ?? emptyUsage()
            const capabilities = parseList(profile.enabledCapabilities)
            return (
              <div key={profile.appSlug} className="rounded-lg border border-slate-800 bg-slate-950/55 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-white">{profile.appName || profile.appSlug}</p>
                    <p className="mt-1 font-mono text-xs text-slate-500">{profile.appSlug} / {profile.appType || 'app'}</p>
                  </div>
                  <StatusPill status={capabilities.length ? 'configured' : 'needs app config'} />
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <Fact icon={<Database />} label="Memory" value={profile.memoryNamespace || `${usage.memory} records`} />
                  <Fact icon={<Database />} label="RAG" value={profile.retrievalNamespace || 'not set'} />
                  <Fact icon={<Workflow />} label="Usage" value={`${usage.assets + usage.artifacts + usage.videoJobs} outputs/jobs`} />
                </div>
              </div>
            )
          }) : (
            <p className="rounded-lg border border-slate-800 bg-slate-950/55 p-4 text-sm leading-7 text-slate-400">
              No connected app profiles found. Planned app cards remain honest until profiles exist in the database.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}

function findProfile(profiles: AppRow[], slug: string) {
  return profiles.find((profile) => profile.appSlug.includes(slug) || profile.appType.includes(slug))
}

function emptyUsage(): Usage {
  return { memory: 0, campaigns: 0, assets: 0, artifacts: 0, videoJobs: 0 }
}

function parseList(value: string): string[] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : []
  } catch {
    return value ? value.split(',').map((item) => item.trim()).filter(Boolean) : []
  }
}

function Fact({ icon, label, value }: { icon: React.ReactElement; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
      <span className="text-cyan-300 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-300">{value}</p>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const tone = status.includes('connected') || status === 'configured'
    ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
    : status.includes('unavailable')
      ? 'border-red-300/20 bg-red-300/10 text-red-100'
      : 'border-amber-300/20 bg-amber-300/10 text-amber-100'
  return <span className={['rounded-full border px-3 py-1 text-xs font-black', tone].join(' ')}>{status}</span>
}
