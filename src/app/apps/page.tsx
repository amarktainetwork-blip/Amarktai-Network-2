import Link from 'next/link'
import { ArrowRight, BriefcaseBusiness, Headphones, Megaphone, Orbit, Search, Sparkles, Users, Workflow } from 'lucide-react'
import PublicShell from '@/components/public/PublicShell'

const apps = [
  ['Marketing', 'Campaign planning, creative assets, approvals, publishing, analytics', Megaphone, 'Live workflow surface'],
  ['Creator', 'Image, video, music, audio, avatar, document artifacts. Adult creator paths are gated, permission-gated, and safety-controlled.', Sparkles, 'Capability runtime'],
  ['Companion', 'Memory, personality, retrieval, safety and permission gates', Users, 'App context layer'],
  ['Automation', 'Background jobs, scheduled tasks, handoffs, artifact references', Workflow, 'Worker-backed flows'],
  ['Research', 'Search, synthesis, retrieval, citations, app knowledge', Search, 'Research agent'],
  ['Customer service', 'Response drafts, FAQ retrieval, escalation summaries', Headphones, 'Service agent'],
  ['Business apps', 'CRM, operations, legal, trading, education and vertical tools', BriefcaseBusiness, 'Thin app model'],
  ['Network apps', 'Any app that requests capabilities from the shared runtime', Orbit, 'Platform expansion'],
]

export default function AppsPage() {
  return (
    <PublicShell>
      <section className="bg-[#03050a] py-24 text-white lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="font-mono text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Apps</p>
          <h1 className="mt-5 max-w-5xl text-5xl font-black leading-none tracking-tight lg:text-7xl">
            Thin apps. Central AI runtime.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            AmarktAI is not a single marketing app. It is the capability platform behind marketing, creator, companion, automation, research, customer service, and business apps. Apps never choose infrastructure routes.
          </p>
        </div>
      </section>

      <section className="bg-[#071019] py-20 text-white lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {apps.map(([name, desc, Icon, status]) => {
            const AppIcon = Icon as typeof Sparkles
            return (
              <article key={String(name)} className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
                <AppIcon className="h-6 w-6 text-cyan-300" />
                <div className="mt-5 flex items-start justify-between gap-3">
                  <h2 className="text-lg font-black text-white">{String(name)}</h2>
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-cyan-200">{String(status)}</span>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-400">{String(desc)}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="bg-[#03050a] py-20 text-white lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="font-mono text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Thin app contract</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight">
            Apps provide intent and context. Runtime provides execution.
          </h2>
          <div className="mt-10 grid gap-3 lg:grid-cols-3">
            {[
              ['Apps send', 'context, capability, input, budget, quality, permissions'],
              ['Runtime decides', 'route, fallback, safety, storage, approval path'],
              ['Apps receive', 'result, artifact reference, selected route proof, status'],
            ].map(([title, body]) => (
              <div key={title} className="rounded-lg border border-white/10 bg-slate-950/70 p-6">
                <h3 className="text-lg font-black text-white">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">{body}</p>
              </div>
            ))}
          </div>
          <Link href="/platform" className="mt-8 inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/8 px-5 py-3 text-sm font-black text-white transition hover:bg-white/12">
            View platform architecture <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PublicShell>
  )
}
