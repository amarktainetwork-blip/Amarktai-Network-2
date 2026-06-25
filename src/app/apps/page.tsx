import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import PublicShell from '@/components/public/PublicShell'

const apps = [
  {
    name: 'Marketing',
    status: 'Live',
    statusColor: 'bg-emerald-100 text-emerald-700',
    desc: 'Autonomous campaign generation, asset creation, approvals, scheduling, and analytics from a single URL input.',
    caps: ['Brand Memory', 'RAG', 'Agents', 'Image / video', 'Publishing'],
  },
  {
    name: 'Customer Service',
    status: 'Planned',
    statusColor: 'bg-slate-100 text-slate-600',
    desc: 'FAQ response drafts, escalation handling, and conversation intelligence — powered by the same RAG and agent layer.',
    caps: ['Chat', 'RAG', 'Agents', 'Analytics'],
  },
  {
    name: 'CRM',
    status: 'Planned',
    statusColor: 'bg-slate-100 text-slate-600',
    desc: 'Contact intelligence, outreach drafts, and relationship memory across your customer base.',
    caps: ['Chat', 'Brand Memory', 'Analytics'],
  },
  {
    name: 'Horse Management',
    status: 'Planned',
    statusColor: 'bg-slate-100 text-slate-600',
    desc: 'Breed records, health tracking, training logs, and AI-generated care plans for equine management.',
    caps: ['Chat', 'Research', 'Storage'],
  },
  {
    name: 'Crypto',
    status: 'Planned',
    statusColor: 'bg-slate-100 text-slate-600',
    desc: 'Market research, signal summaries, and alert generation for crypto portfolios and trading.',
    caps: ['Research', 'Agents', 'Analytics'],
  },
  {
    name: 'Adult Creator',
    status: 'Gated',
    statusColor: 'bg-amber-100 text-amber-700',
    desc: 'Permission-gated, safety-controlled adult content creation. Requires explicit permissions, consent checks, and passes all platform safety restrictions.',
    caps: ['Image', 'Voice', 'Avatars', 'Safety gate'],
  },
  {
    name: 'Education',
    status: 'Planned',
    statusColor: 'bg-slate-100 text-slate-600',
    desc: 'Course material generation, tutoring agents, and personalised learning content at scale.',
    caps: ['Chat', 'Research', 'Agents'],
  },
  {
    name: 'Legal',
    status: 'Planned',
    statusColor: 'bg-slate-100 text-slate-600',
    desc: 'Document drafts, clause analysis, and research summaries for legal workflows.',
    caps: ['Chat', 'Research', 'RAG'],
  },
  {
    name: 'Music',
    status: 'Planned',
    statusColor: 'bg-slate-100 text-slate-600',
    desc: 'Music generation, catalogue management, and brand audio identity from one platform.',
    caps: ['Music', 'Voice', 'Storage'],
  },
  {
    name: 'Trading',
    status: 'Planned',
    statusColor: 'bg-slate-100 text-slate-600',
    desc: 'Research synthesis, market signal summaries, and automated alert generation for trading workflows.',
    caps: ['Research', 'Agents', 'Analytics'],
  },
]

export default function AppsPage() {
  return (
    <PublicShell>
      {/* Hero */}
      <section className="bg-[#050a12] py-24 text-white lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Apps</p>
          <h1 className="mt-5 max-w-5xl text-5xl font-black leading-[1.02] tracking-tight lg:text-7xl">
            Apps stay simple. <span className="text-blue-400">AmarktAI</span> handles the AI layer.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Each app requests workflows and capabilities from the platform. AmarktAI handles routing, providers, storage, memory, approvals, scheduling, publishing, analytics, and learning. Apps never choose providers or models.
          </p>
        </div>
      </section>

      {/* App grid */}
      <section className="bg-white py-20 text-slate-950 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Platform apps</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight">
            One platform. Every vertical.
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {apps.map((app) => (
              <article key={app.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-black text-slate-900">{app.name}</h3>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${app.statusColor}`}>{app.status}</span>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-600">{app.desc}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {app.caps.map((cap) => (
                    <span key={cap} className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">{cap}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How apps work */}
      <section className="bg-[#050a12] py-20 text-white lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">How apps work</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight">
            Apps request capabilities. AmarktAI executes.
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              { title: 'App sends request', body: 'App specifies a capability goal and workflow parameters. No provider, model, or endpoint is set by the app.' },
              { title: 'AmarktAI routes', body: 'The platform selects provider, model, quality tier, and fallback chain. Handles storage, approvals, and analytics automatically.' },
              { title: 'App receives result', body: 'Asset saved, approval state managed, learning signal recorded. Clean result returned to app.' },
            ].map((c) => (
              <div key={c.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-lg font-black">{c.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-16 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h2 className="text-3xl font-black tracking-tight">Start with marketing. Expand to any app.</h2>
            <p className="mt-2 text-blue-100">The platform is ready. Apps stay simple.</p>
          </div>
          <Link href="/admin/login" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-black text-blue-700 transition hover:bg-blue-50">
            Open Dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PublicShell>
  )
}
