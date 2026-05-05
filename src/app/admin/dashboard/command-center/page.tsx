'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Activity, AlertTriangle, ArrowRight, Bot, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react'

type SystemState = 'ready' | 'warning' | 'blocked' | 'unknown'

interface LiveSystem {
  id: string
  name: string
  state: SystemState
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
}

const stateClass: Record<SystemState, string> = {
  ready: 'border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-100',
  warning: 'border-amber-400/25 bg-amber-400/[0.08] text-amber-100',
  blocked: 'border-red-400/25 bg-red-400/[0.08] text-red-100',
  unknown: 'border-slate-400/20 bg-slate-400/[0.08] text-slate-200',
}

const nextActions = [
  { title: 'Add provider API keys', href: '/admin/dashboard/settings', status: 'Needs key' },
  { title: 'Configure GitHub & Webdock', href: '/admin/dashboard/settings', status: 'Needs key' },
  { title: 'Fix health endpoint & run diagnostics', href: '/admin/dashboard/diagnostics', status: 'Ready to wire' },
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
      if (!res.ok || data.success === false) throw new Error(data.error ?? 'Failed to load network readiness')
      setReadiness(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load network readiness')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const summary = useMemo(() => {
    const systems = readiness?.systems ?? []
    return {
      ready: systems.filter((system) => system.state === 'ready').length,
      warnings: systems.filter((system) => system.state === 'warning').length,
      blocked: systems.filter((system) => system.state === 'blocked').length,
      total: systems.length,
    }
  }, [readiness])

  const urgentSystems = useMemo(() => {
    const systems = readiness?.systems ?? []
    return systems.filter((system) => system.state === 'blocked' || system.state === 'warning').slice(0, 6)
  }, [readiness])

  return (
    <div className="space-y-5">
      <header className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">Operator console</p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">Command Center</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              One control room for network status, approvals, blockers and the next operational move. No marketing, no duplicate actions, no fake green lights.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/[0.08] disabled:opacity-40">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Link href="/admin/dashboard/diagnostics" className="inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-4 py-2.5 text-xs font-black text-slate-950 hover:bg-white">
              Open Diagnostics <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Network score" value={readiness?.score ?? '—'} suffix="/100" />
        <Metric label="Ready systems" value={summary.ready} suffix={`/${summary.total || '—'}`} />
        <Metric label="Warnings" value={summary.warnings} warn={summary.warnings > 0} />
        <Metric label="Blocked" value={summary.blocked} danger={summary.blocked > 0} />
      </section>

      {error && <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">{error}</div>}

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-black text-white"><Bot className="h-5 w-5 text-cyan-200" /> AmarktAI Assistant briefing</h2>
            <span className="rounded-full border border-cyan-400/25 bg-cyan-400/[0.08] px-3 py-1 text-[10px] font-bold text-cyan-100">Ready to wire</span>
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-slate-300">
            <p>AmarktAI Network operator console is operational. Add provider keys, configure GitHub and Webdock, enable memory storage, and run the adult provider test to unlock full capability.</p>
            <p className="mt-3 text-slate-500">This briefing becomes live once AmarktAI Assistant can read diagnostics, apps, memory and pending approvals.</p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {nextActions.map((action) => (
              <Link key={action.title} href={action.href} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 hover:border-cyan-300/25 hover:bg-cyan-300/[0.035]">
                <p className="text-sm font-bold text-white">{action.title}</p>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200">{action.status}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="flex items-center gap-2 text-lg font-black text-white"><ShieldCheck className="h-5 w-5 text-cyan-200" /> Approvals & blockers</h2>
          <div className="mt-4 space-y-3">
            {urgentSystems.length ? urgentSystems.map((system) => (
              <div key={system.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-white">{system.name}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{system.detail}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${stateClass[system.state]}`}>{system.state}</span>
                </div>
                {system.nextAction && <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/10 p-2 text-xs text-amber-100"><AlertTriangle className="mr-1 inline h-3.5 w-3.5" />{system.nextAction}</p>}
              </div>
            )) : (
              <p className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100"><CheckCircle2 className="mr-1.5 inline h-4 w-4" />No urgent blockers returned by diagnostics.</p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-black text-white"><Activity className="h-5 w-5 text-cyan-200" /> Recent network status</h2>
          <Link href="/admin/dashboard/diagnostics" className="text-xs text-cyan-300 hover:underline">View all diagnostics</Link>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {(readiness?.systems ?? []).slice(0, 8).map((system) => (
            <div key={system.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{system.name}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{system.detail}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${stateClass[system.state]}`}>{system.state}</span>
              </div>
            </div>
          ))}
          {!readiness?.systems?.length && <p className="p-4 text-sm text-slate-500">Loading diagnostics snapshot…</p>}
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
