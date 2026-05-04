'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowRight,
  Bot,
  CheckCircle2,
  Database,
  Film,
  GitBranch,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
} from 'lucide-react'

interface LiveSystem {
  id: string
  name: string
  state: 'ready' | 'warning' | 'blocked' | 'unknown'
  detail: string
  nextAction: string | null
}

interface LiveReadiness {
  success: boolean
  generatedAt: string
  overallReady: boolean
  score: number
  systems: LiveSystem[]
  blockers: string[]
  metrics: Record<string, number>
  links: Record<string, string>
}

type ModuleState = 'Working' | 'Needs key' | 'Backend pending' | 'Ready to wire' | 'Post-launch' | 'Blocked'

const stateClass: Record<LiveSystem['state'], string> = {
  ready: 'border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-100',
  warning: 'border-amber-400/20 bg-amber-400/[0.08] text-amber-100',
  blocked: 'border-red-400/20 bg-red-400/[0.08] text-red-100',
  unknown: 'border-slate-400/20 bg-slate-400/[0.08] text-slate-100',
}

const moduleClass: Record<ModuleState, string> = {
  Working: 'border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-100',
  'Needs key': 'border-amber-400/25 bg-amber-400/[0.08] text-amber-100',
  'Backend pending': 'border-sky-400/25 bg-sky-400/[0.08] text-sky-100',
  'Ready to wire': 'border-cyan-400/25 bg-cyan-400/[0.08] text-cyan-100',
  'Post-launch': 'border-slate-400/20 bg-slate-400/[0.06] text-slate-300',
  Blocked: 'border-red-400/25 bg-red-400/[0.08] text-red-100',
}

const modules: Array<{ title: string; href: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; state: ModuleState; body: string }> = [
  { title: 'AI Assistant', href: '/admin/dashboard/ai-engine/hub', icon: Bot, state: 'Ready to wire', body: 'Operator conversation, route visibility, approvals and memory surfaces.' },
  { title: 'Repo Workbench', href: '/admin/dashboard/repo-workbench', icon: GitBranch, state: 'Ready to wire', body: 'Import repo, choose Update/Add/Audit/Fix, enter command, review plan/diff, run checks, create PR.' },
  { title: 'Media Studio', href: '/admin/dashboard/media-studio', icon: Film, state: 'Needs key', body: 'Image, video, voice and media tools. Status reflects configured providers.' },
  { title: 'Scraping / Research', href: '/admin/dashboard/ai-engine/intelligence', icon: Search, state: 'Ready to wire', body: 'Firecrawl and backup crawler for website intelligence and scraped-page storage.' },
  { title: 'Artifacts / Storage', href: '/admin/dashboard/artifacts', icon: Archive, state: 'Ready to wire', body: 'Generated outputs, repo reports, scraped pages and job artifacts stored for review.' },
  { title: 'Actions / Approvals', href: '/admin/dashboard/ai-engine/aiva-actions', icon: ShieldCheck, state: 'Backend pending', body: 'Approval-gated actions only. Nothing destructive runs without explicit confirmation and audit.' },
  { title: 'Diagnostics', href: '/admin/dashboard/system-health', icon: Database, state: 'Working', body: 'Health, readiness, static asset proof, runtime status, storage, GitHub, queue and provider checks.' },
  { title: 'Settings', href: '/admin/dashboard/settings', icon: Settings2, state: 'Working', body: 'The only place to add, test and remove provider/tool keys and platform configuration.' },
]

export default function CommandCenterPage() {
  const [readiness, setReadiness] = useState<LiveReadiness | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/live-readiness')
      const data = await res.json()
      if (!res.ok || data.success === false) throw new Error(data.error ?? 'Failed to load command center readiness')
      setReadiness(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load command center readiness')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const summary = useMemo(() => {
    const systems = readiness?.systems ?? []
    return {
      blocked: systems.filter((system) => system.state === 'blocked').length,
      warnings: systems.filter((system) => system.state === 'warning').length,
      ready: systems.filter((system) => system.state === 'ready').length,
      total: systems.length,
    }
  }, [readiness])

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#071426] via-[#050b17] to-[#140a22] p-5 shadow-2xl shadow-black/25 lg:p-7">
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr] xl:items-stretch">
          <div>
            <h1 className="max-w-4xl text-3xl font-black tracking-tight text-white sm:text-4xl xl:text-5xl">
              Amarkt<span className="text-blue-400">AI</span> Network — Command Center
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400 sm:text-base">
              The operator console for the Amarkt<span className="text-blue-400">AI</span> Network. Every module shows its real status. Configure providers in Settings, monitor system health in Diagnostics.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/admin/dashboard/settings" className="inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-white">Configure providers <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/admin/dashboard/system-health" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white hover:bg-white/[0.08]">Open Diagnostics</Link>
              <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-slate-300 hover:text-white disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Metric label="Foundation score" value={readiness?.score ?? '—'} suffix="/100" />
            <Metric label="Ready systems" value={summary.ready} suffix={`/${summary.total || '—'}`} />
            <Metric label="Warnings" value={summary.warnings} warn={summary.warnings > 0} />
            <Metric label="Blocked" value={summary.blocked} danger={summary.blocked > 0} />
          </div>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">{error}</div>}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {modules.map((module) => (
          <Link key={module.title} href={module.href} className="group rounded-3xl border border-white/10 bg-white/[0.035] p-5 transition hover:border-cyan-300/30 hover:bg-cyan-300/[0.04]">
            <div className="flex items-start justify-between gap-3">
              <module.icon className="h-7 w-7 text-cyan-200" />
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${moduleClass[module.state]}`}>{module.state}</span>
            </div>
            <h2 className="mt-5 text-lg font-bold text-white group-hover:text-cyan-100">{module.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{module.body}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white"><Activity className="h-5 w-5 text-cyan-200" /> Diagnostics snapshot</h2>
            <Link href="/admin/dashboard/system-health" className="text-xs text-cyan-300 hover:underline">Full Diagnostics</Link>
          </div>
          <div className="mt-4 space-y-3">
            {readiness?.systems?.map((system) => (
              <div key={system.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{system.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{system.detail}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${stateClass[system.state]}`}>{system.state}</span>
                </div>
                {system.nextAction && <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/10 p-2 text-xs text-amber-100"><AlertTriangle className="mr-1 inline h-3.5 w-3.5" />{system.nextAction}</p>}
              </div>
            )) ?? <p className="p-4 text-sm text-slate-500">Loading system status…</p>}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white"><AlertTriangle className="h-5 w-5 text-amber-200" /> Blockers</h2>
          <div className="mt-4 space-y-2">
            {readiness?.blockers?.length ? readiness.blockers.slice(0, 8).map((blocker) => (
              <p key={blocker} className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-slate-300">{blocker}</p>
            )) : (
              <p className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100"><CheckCircle2 className="mr-1.5 inline h-4 w-4" />No blockers returned by runtime readiness.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value, suffix, warn, danger }: { label: string; value: number | string; suffix?: string; warn?: boolean; danger?: boolean }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600">{label}</p>
      <p className={`mt-2 text-3xl font-black ${danger ? 'text-red-200' : warn ? 'text-amber-200' : 'text-white'}`}>{value}<span className="ml-1 text-sm text-slate-500">{suffix}</span></p>
    </div>
  )
}
