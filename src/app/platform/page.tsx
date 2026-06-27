import Link from 'next/link'
import { ArrowRight, CheckCircle2, Database, Gauge, Lock, Network, Route, ShieldCheck, Workflow } from 'lucide-react'
import PublicShell from '@/components/public/PublicShell'

const controlPlane = [
  ['App context', 'Workspace, brand, app profile, memory, RAG, permissions'],
  ['Capability policy', 'Budget tier, quality tier, safety gates, approval rules'],
  ['Runtime routing', 'Execution path, fallback, latency, cost, verification state'],
  ['Persistence', 'Artifacts, generated assets, campaign items, proofs, logs'],
  ['Learning', 'Execution signals, campaign outcomes, agent summaries'],
]

const pillars = [
  { icon: Route, title: 'Runtime routing', body: 'Apps request a capability. Runtime chooses the execution path, fallback, and quality tier after checking live readiness.' },
  { icon: Database, title: 'Context and memory', body: 'Brand memory, retrieval context, storage, artifacts, and app profiles travel with each request.' },
  { icon: Workflow, title: 'Workflow execution', body: 'Campaigns, agents, media jobs, approvals, and publishing flows use the same central execution layer.' },
  { icon: ShieldCheck, title: 'Operational truth', body: 'The control centre reports configured, unconfigured, working, failed, unsupported, and requires-verification states without fake success.' },
]

export default function PlatformPage() {
  return (
    <PublicShell>
      <section className="bg-[#03050a] py-24 text-white lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="font-mono text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Platform</p>
          <h1 className="mt-5 max-w-5xl text-5xl font-black leading-none tracking-tight lg:text-7xl">
            The runtime layer for AI-powered apps.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            AmarktAI centralizes execution, agent orchestration, memory, media generation, storage, approvals, and learning so apps can stay thin.
          </p>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#071019] py-20 text-white lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="font-mono text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Control plane</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight lg:text-5xl">
            Everything the runtime decides before execution.
          </h2>
          <div className="mt-10 grid gap-3 lg:grid-cols-5">
            {controlPlane.map(([title, body], index) => (
              <article key={title} className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
                <p className="font-mono text-[10px] font-black text-cyan-300">0{index + 1}</p>
                <h3 className="mt-4 text-sm font-black text-white">{title}</h3>
                <p className="mt-2 text-xs leading-6 text-slate-500">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#03050a] py-20 text-white lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {pillars.map(({ icon: Icon, title, body }) => (
            <article key={title} className="rounded-lg border border-white/10 bg-slate-950/70 p-6">
              <Icon className="h-6 w-6 text-cyan-300" />
              <h2 className="mt-5 text-lg font-black text-white">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#071019] py-20 text-white lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Runtime rule</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight lg:text-5xl">
              Apps never choose infrastructure routes.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-400">
              A capability request may include budget, quality, context, safety, and artifact requirements. Runtime selection is reported after execution as proof, not exposed as an input control.
            </p>
          </div>
          <div className="rounded-lg border border-cyan-300/15 bg-cyan-300/[0.05] p-6">
            {[
              [Network, 'Execution network', 'routing, fallback, budget, quality, and proof'],
              [Gauge, 'Runtime knobs', 'budget tier, quality tier, safety gates'],
              [Lock, 'Governance', 'approval state, permissions, and safety gates'],
              [CheckCircle2, 'Proof', 'selected runtime path shown only after execution'],
            ].map(([Icon, label, value]) => {
              const RowIcon = Icon as typeof Network
              return (
                <div key={String(label)} className="flex items-center gap-4 border-b border-white/10 py-4 last:border-b-0">
                  <RowIcon className="h-5 w-5 text-cyan-300" />
                  <div>
                    <p className="text-sm font-black text-white">{String(label)}</p>
                    <p className="mt-1 text-xs text-slate-500">{String(value)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-cyan-400 py-16 text-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h2 className="text-3xl font-black tracking-tight">Open the operational control centre.</h2>
            <p className="mt-2 text-sm font-semibold text-slate-800">Runtime health, route state, artifacts, campaigns, agents, and system gates in one place.</p>
          </div>
          <Link href="/admin/login" className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-900">
            Open dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PublicShell>
  )
}
