'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import {
  Activity,
  ArrowRight,
  Bot,
  Boxes,
  BrainCircuit,
  Compass,
  ImageIcon,
  LineChart,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wand2,
} from 'lucide-react'

interface LiveReadiness {
  score: number
  overallReady: boolean
  metrics: Record<string, number>
  blockers: string[]
}

const tools = [
  {
    title: 'Provider Intelligence',
    href: '/admin/dashboard/ai-engine/intelligence',
    icon: LineChart,
    body: 'See which routes are fast, failing or safe to use based on real logs.',
  },
  {
    title: 'App AI Setup',
    href: '/admin/dashboard/ai-engine/app-setup',
    icon: Boxes,
    body: 'Create and save per-product intelligence packages without one global default.',
  },
  {
    title: 'Artifact Gallery',
    href: '/admin/dashboard/ai-engine/artifacts',
    icon: ImageIcon,
    body: 'Review generated media, provider task output and saved AI artifacts.',
  },
  {
    title: 'AI Actions',
    href: '/admin/dashboard/ai-engine/aiva-actions',
    icon: ShieldCheck,
    body: 'See what AmarktAI Assistant can read, propose and execute only after approval.',
  },
  {
    title: 'AI Ops Command Center',
    href: '/admin/dashboard/ai-engine/ops',
    icon: Wand2,
    body: 'Open the grouped AI operations control surface.',
  },
  {
    title: 'Live Readiness',
    href: '/admin/dashboard/live-readiness',
    icon: Compass,
    body: 'Confirm what is connected and what still blocks go-live.',
  },
]

const principles = [
  'AmarktAI Assistant is the operator experience, not a hidden model selector.',
  'Every product can receive its own intelligence package.',
  'Routes should be fast, streaming and measured from real usage.',
  'Powerful actions require approval and leave an audit trail.',
]

export default function AIEngineHubPage() {
  const [readiness, setReadiness] = useState<LiveReadiness | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/live-readiness')
      const data = await res.json()
      if (!res.ok || data.success === false) throw new Error(data.error ?? 'Failed to load readiness')
      setReadiness(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load readiness')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#071426] via-[#050b17] to-[#12091f] p-6 shadow-2xl shadow-black/20 lg:p-8">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="absolute -bottom-28 left-10 h-72 w-72 rounded-full bg-violet-400/10 blur-3xl" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-semibold text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" /> AmarktAI Intelligence Engine
            </div>
            <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl">
              The brain behind Amarkt<span className="text-blue-400">AI</span> Network.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
              This is where AmarktAI Assistant, product intelligence packages, smart routing, provider memory, generated artifacts and action permissions come together. Providers stay infrastructure; the operator experience stays AmarktAI.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/admin/dashboard/ai-engine/ops" className="inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-white">Open AI Ops <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/admin/dashboard/ai-engine/app-setup" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white hover:bg-white/[0.08]">Set up product AI</Link>
              <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-slate-300 hover:text-white disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-black/25 p-5 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3"><Bot className="h-6 w-6 text-cyan-200" /></div>
              <div>
                <p className="text-sm font-bold text-white">AmarktAI route health</p>
                <p className="text-xs text-slate-500">Live readiness score</p>
              </div>
            </div>
            <div className="mt-5 flex items-end gap-3">
              <span className="text-6xl font-black text-white">{readiness?.score ?? '—'}</span>
              <span className="pb-2 text-sm text-slate-500">/100</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric label="Providers" value={readiness?.metrics.configuredProviders ?? 0} />
              <Metric label="Capabilities" value={readiness?.metrics.availableCapabilities ?? 0} />
              <Metric label="App packages" value={readiness?.metrics.savedAppPackages ?? 0} />
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

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white"><BrainCircuit className="h-5 w-5 text-violet-200" /> Intelligence principles</h2>
          <div className="mt-4 space-y-2">
            {principles.map((item) => (
              <p key={item} className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-slate-300">{item}</p>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white"><Activity className="h-5 w-5 text-emerald-200" /> What still needs attention</h2>
          <div className="mt-4 space-y-2">
            {readiness?.blockers?.length ? readiness.blockers.slice(0, 6).map((blocker) => (
              <p key={blocker} className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-slate-300">{blocker}</p>
            )) : (
              <p className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">No live-readiness blockers returned.</p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-cyan-300/10 bg-cyan-300/[0.04] p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-white"><MessageSquareText className="h-5 w-5 text-cyan-200" /> AI Assistant conversation</h2>
            <p className="mt-1 text-sm text-slate-400">Streaming conversation is handled through the AI Assistant panel and smart routing endpoint. Route metadata should stay collapsed by default, with voice controls visible only after TTS is verified.</p>
          </div>
          <Link href="/admin/dashboard/command-center" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white hover:bg-white/[0.08]">Return to Command Center <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-600">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
  )
}
