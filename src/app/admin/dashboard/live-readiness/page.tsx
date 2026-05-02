'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, CheckCircle2, Compass, ExternalLink, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react'

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

const stateStyle = {
  ready: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100',
  warning: 'border-amber-400/20 bg-amber-400/10 text-amber-100',
  blocked: 'border-red-400/20 bg-red-400/10 text-red-100',
  unknown: 'border-slate-400/20 bg-slate-400/10 text-slate-100',
}

export default function LiveReadinessPage() {
  const [data, setData] = useState<LiveReadiness | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/live-readiness')
      const json = await res.json()
      if (!res.ok || json.success === false) throw new Error(json.error ?? 'Failed to load live readiness')
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load live readiness')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#071426] via-[#050b17] to-[#12091f] p-6 shadow-2xl shadow-black/20">
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="absolute -bottom-20 left-10 h-60 w-60 rounded-full bg-violet-400/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link href="/admin/dashboard" className="mb-4 inline-flex items-center gap-2 text-xs text-slate-500 hover:text-cyan-300"><ArrowLeft className="h-3.5 w-3.5" /> Command Center</Link>
            <div className="flex items-center gap-3">
              <Compass className="h-7 w-7 text-cyan-200" />
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white">Live Readiness</h1>
                <p className="mt-1 text-sm text-slate-400">Real-time view of what is connected, what works, and what blocks go-live.</p>
              </div>
            </div>
          </div>
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/[0.08] disabled:opacity-40">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">{error}</div>}

      {data && (
        <>
          <section className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
            <div className={`rounded-[2rem] border p-6 ${data.overallReady ? 'border-emerald-400/20 bg-emerald-400/[0.06]' : 'border-red-400/20 bg-red-400/[0.06]'}`}>
              <div className="flex items-start gap-4">
                {data.overallReady ? <ShieldCheck className="h-10 w-10 text-emerald-200" /> : <ShieldAlert className="h-10 w-10 text-red-200" />}
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Overall status</p>
                  <h2 className="mt-2 text-3xl font-black text-white">{data.overallReady ? 'Ready for controlled go-live' : 'Not ready yet'}</h2>
                  <p className="mt-2 text-sm text-slate-400">Score {data.score}/100 · Updated {new Date(data.generatedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(data.metrics).slice(0, 6).map(([key, value]) => (
                <div key={key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-600">{key.replace(/([A-Z])/g, ' $1')}</p>
                  <p className="mt-2 text-xl font-bold text-white">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.systems.map((system) => (
              <div key={system.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-white">{system.name}</h3>
                    <p className="mt-2 text-sm text-slate-400">{system.detail}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${stateStyle[system.state]}`}>{system.state}</span>
                </div>
                {system.nextAction && (
                  <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-100">
                    <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5" /> {system.nextAction}
                  </div>
                )}
              </div>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="flex items-center gap-2 text-lg font-bold text-white"><AlertTriangle className="h-5 w-5 text-amber-200" /> Go-live blockers / next actions</h2>
              <div className="mt-4 space-y-2">
                {data.blockers.length === 0 ? (
                  <p className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100"><CheckCircle2 className="mr-1.5 inline h-4 w-4" /> No blockers returned by the live readiness endpoint.</p>
                ) : data.blockers.map((blocker) => (
                  <p key={blocker} className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-slate-300">{blocker}</p>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="text-lg font-bold text-white">Open related tools</h2>
              <div className="mt-4 space-y-2">
                {Object.entries(data.links).map(([label, href]) => (
                  <Link key={href} href={href} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300 hover:border-cyan-300/30 hover:text-cyan-100">
                    {label.replace(/([A-Z])/g, ' $1')} <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
