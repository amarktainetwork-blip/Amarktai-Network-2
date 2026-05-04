'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Activity, AlertTriangle, ArrowRight, Bot, Boxes, CheckCircle2, Compass, GitBranch, ImageIcon, LineChart, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'

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

const tools = [
  { title: 'Talk to Aiva', href: '/admin/dashboard/ai-engine', icon: Bot, body: 'Streaming operator conversation, routing and approvals.' },
  { title: 'Live Readiness', href: '/admin/dashboard/live-readiness', icon: Compass, body: 'Real-time go-live blockers and connected systems.' },
  { title: 'Provider Intelligence', href: '/admin/dashboard/ai-engine/intelligence', icon: LineChart, body: 'Provider scores, failures, latency and recommendations.' },
  { title: 'App AI Setup', href: '/admin/dashboard/ai-engine/app-setup', icon: Boxes, body: 'Save per-app AI packages, capabilities and budgets.' },
  { title: 'Artifact Gallery', href: '/admin/dashboard/ai-engine/artifacts', icon: ImageIcon, body: 'Generated media, task JSON, audio and outputs.' },
  { title: 'Repo Workbench', href: '/admin/dashboard/repo-workbench', icon: GitBranch, body: 'Simple repo command to patch/review flow.' },
]

const stateClass = {
  ready: 'border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-100',
  warning: 'border-amber-400/20 bg-amber-400/[0.08] text-amber-100',
  blocked: 'border-red-400/20 bg-red-400/[0.08] text-red-100',
  unknown: 'border-slate-400/20 bg-slate-400/[0.08] text-slate-100',
}

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

  const blocked = readiness?.systems?.filter((system) => system.state === 'blocked').length ?? 0
  const warnings = readiness?.systems?.filter((system) => system.state === 'warning').length ?? 0

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#071426] via-[#050b17] to-[#140a22] p-6 shadow-2xl shadow-black/25 lg:p-8">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="absolute -bottom-24 left-16 h-72 w-72 rounded-full bg-violet-400/10 blur-3xl" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-semibold text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" /> Amarktai Network Command Center
            </div>
            <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl xl:text-6xl">Operate every app, AI route, artifact and repo from one place.</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">Aiva is your live operator. This command center shows what is connected, what is healthy, what needs approval and what still blocks go-live.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/admin/dashboard/ai-engine" className="inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-white">Open Aiva <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/admin/dashboard/live-readiness" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white hover:bg-white/[0.08]">View readiness</Link>
              <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-slate-300 hover:text-white disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
            </div>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-black/25 p-5 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Live go-live score</p>
            <div className="mt-4 flex items-end gap-3">
              <span className="text-6xl font-black text-white">{readiness?.score ?? '—'}</span>
              <span className="pb-2 text-sm text-slate-500">/100</span>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
              <div className={`h-full rounded-full ${readiness?.overallReady ? 'bg-emerald-300' : 'bg-cyan-300'}`} style={{ width: `${Math.max(0, Math.min(100, readiness?.score ?? 0))}%` }} />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric label="Blocked" value={blocked} warn={blocked > 0} />
              <Metric label="Warnings" value={warnings} warn={warnings > 0} />
              <Metric label="Providers" value={readiness?.metrics.configuredProviders ?? 0} />
              <Metric label="Artifacts" value={readiness?.metrics.recentArtifacts ?? 0} />
            </div>
          </div>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">{error}</div>}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href} className="group rounded-3xl border border-white/10 bg-white/[0.035] p-5 transition hover:border-cyan-300/30 hover:bg-cyan-300/[0.04]">
            <tool.icon className="h-7 w-7 text-cyan-200" />
            <h2 className="mt-5 text-lg font-bold text-white group-hover:text-cyan-100">{tool.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{tool.body}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white"><Activity className="h-5 w-5 text-cyan-200" /> Connected systems</h2>
            <Link href="/admin/dashboard/live-readiness" className="text-xs text-cyan-300 hover:underline">Full view</Link>
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
            )) ?? <p className="p-4 text-sm text-slate-500">Loading system state…</p>}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white"><ShieldCheck className="h-5 w-5 text-emerald-200" /> Go-live blockers</h2>
          <div className="mt-4 space-y-2">
            {readiness?.blockers?.length ? readiness.blockers.slice(0, 8).map((blocker) => (
              <p key={blocker} className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-slate-300">{blocker}</p>
            )) : (
              <p className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100"><CheckCircle2 className="mr-1.5 inline h-4 w-4" />No blockers returned by live readiness.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"><p className="text-[10px] uppercase tracking-[0.16em] text-slate-600">{label}</p><p className={`mt-1 text-xl font-black ${warn ? 'text-amber-200' : 'text-white'}`}>{value}</p></div>
}
