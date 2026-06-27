import Link from 'next/link'
import type React from 'react'
import { AppWindow, Database, FolderOpen, HeartPulse, Megaphone, Plus, ShieldCheck } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import AddAppFlow from '@/components/dashboard/AddAppFlow'

export const dynamic = 'force-dynamic'

type AppRow = {
  appSlug: string
  appName: string
  appType: string
  domain: string
  costMode: string
  routingStrategy: string
  safeMode: boolean
  enabledCapabilities: string
  memoryNamespace: string
  retrievalNamespace: string
}

type Usage = { memory: number; assets: number; artifacts: number; videoJobs: number }
type Snapshot = { connected: boolean; error: string | null; profiles: AppRow[]; counts: Record<string, Usage> }

const appTemplates = [
  { name: 'Marketing App', icon: Megaphone, description: 'Campaign planning, brand memory, generated assets, and approval-ready workflow outputs.' },
  { name: 'Adult Companion App', icon: AppWindow, description: 'Policy-gated private app template for persona, memory, media, voice, and app-scoped controls.' },
  { name: 'Horse App', icon: HeartPulse, description: 'Horse profiles, health notes, care documents, research, reminders, and owner workflows.' },
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
        enabledCapabilities: true,
        memoryNamespace: true,
        retrievalNamespace: true,
      },
    })

    const counts: Snapshot['counts'] = {}
    await Promise.all(profiles.map(async (profile) => {
      const [memory, assets, artifacts, videoJobs] = await Promise.all([
        prisma.memoryEntry.count({ where: { appSlug: profile.appSlug } }).catch(() => 0),
        prisma.generatedAsset.count({ where: { appSlug: profile.appSlug } }).catch(() => 0),
        prisma.artifact.count({ where: { appSlug: profile.appSlug } }).catch(() => 0),
        prisma.videoGenerationJob.count({ where: { appSlug: profile.appSlug } }).catch(() => 0),
      ])
      counts[profile.appSlug] = { memory, assets, artifacts, videoJobs }
    }))

    return { connected: true, error: null, profiles, counts }
  } catch (error) {
    return { connected: false, error: error instanceof Error ? error.message : 'Database unavailable', profiles: [], counts: {} }
  }
}

export default async function AppsPage() {
  const snapshot = await getSnapshot()

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-[#071019] p-6 lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Apps</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white lg:text-5xl">Connected apps</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
              Real connected app profiles appear here. Templates are separated below and are not counted as connected until an app profile exists.
            </p>
          </div>
          <Link href="#add-app" className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-cyan-200">
            <Plus className="h-4 w-4" />
            Add App
          </Link>
        </div>
        {!snapshot.connected && (
          <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/8 px-3 py-2 text-sm font-bold text-amber-200">
            App profiles are unavailable. Open System for database diagnostics.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-black text-white">Connected app profiles</h2>
          <StatusPill status={`${snapshot.profiles.length} connected`} />
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {snapshot.profiles.length ? snapshot.profiles.map((profile) => {
            const usage = snapshot.counts[profile.appSlug] ?? emptyUsage()
            const capabilities = parseList(profile.enabledCapabilities)
            return (
              <article key={profile.appSlug} className="rounded-2xl border border-slate-800 bg-slate-950/55 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-black text-white">{profile.appName || profile.appSlug}</p>
                    <p className="mt-1 font-mono text-xs text-slate-500">{profile.appSlug} / {profile.appType || 'app'}</p>
                  </div>
                  <StatusPill status={capabilities.length ? 'configured' : 'needs config'} />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Fact icon={<Database />} label="Memory" value={profile.memoryNamespace || `${usage.memory} records`} />
                  <Fact icon={<FolderOpen />} label="Outputs" value={String(usage.assets + usage.artifacts + usage.videoJobs)} />
                  <Fact icon={<ShieldCheck />} label="Policy" value={profile.safeMode ? 'safe mode' : 'custom'} />
                </div>
              </article>
            )
          }) : (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-10 text-center">
              <AppWindow className="mx-auto h-9 w-9 text-slate-600" />
              <p className="mt-4 text-lg font-black text-white">No apps connected yet</p>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-slate-500">
                Add an app profile when a real app is ready to request capabilities from the runtime.
              </p>
              <Link href="#add-app" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-2.5 text-sm font-black text-cyan-200">
                <Plus className="h-4 w-4" />
                Add App
              </Link>
            </div>
          )}
        </div>
      </section>

      <AddAppFlow />

      <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Templates / next apps</p>
        <h2 className="mt-2 text-lg font-black text-white">Optional starting points</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {appTemplates.map(({ name, icon: Icon, description }) => (
            <article key={name} className="rounded-2xl border border-slate-800 bg-slate-950/55 p-5">
              <Icon className="h-5 w-5 text-cyan-300" />
              <h3 className="mt-4 text-base font-black text-white">{name}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-500">{description}</p>
              <p className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">Template only, not connected</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function emptyUsage(): Usage {
  return { memory: 0, assets: 0, artifacts: 0, videoJobs: 0 }
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
    <div className="rounded-xl border border-slate-800 bg-slate-900/55 p-3">
      <span className="text-cyan-300 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-300">{value}</p>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const tone = status.includes('connected') || status === 'configured'
    ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
    : 'border-amber-300/20 bg-amber-300/10 text-amber-100'
  return <span className={['rounded-full border px-3 py-1 text-xs font-black', tone].join(' ')}>{status}</span>
}
