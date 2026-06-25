import Link from 'next/link'
import { ArrowRight, BarChart3, BookOpen, Bot, Layers3, Network, Package, Shield } from 'lucide-react'
import PublicShell from '@/components/public/PublicShell'

const pillars = [
  {
    icon: Network,
    title: 'AI capability layer',
    body: 'Apps request capabilities. AmarktAI handles routing, providers, fallback chains, cost control, and quality tiers automatically.',
  },
  {
    icon: Layers3,
    title: 'Shared runtime',
    body: 'Every app uses the same AI capability layer — one runtime handles all provider connections, model routing, and health checks.',
  },
  {
    icon: BookOpen,
    title: 'Brand Memory and RAG',
    body: 'Brand identity is extracted, stored, and retrieved. Every campaign and agent call is guided by persistent brand context.',
  },
  {
    icon: Bot,
    title: 'Agents',
    body: 'Marketing, research, customer service, and automation agents run through the capability layer. Apps never configure providers directly.',
  },
  {
    icon: Package,
    title: 'Asset storage and approvals',
    body: 'Every generated asset is versioned and stored. Approvals are enforced before publishing — no asset publishes without explicit approval.',
  },
  {
    icon: BarChart3,
    title: 'Analytics and learning',
    body: 'Published results feed learning signals back to the runtime. Agents and workflows improve over time.',
  },
  {
    icon: Shield,
    title: 'VPS readiness',
    body: 'Real-time health checks for CPU, RAM, disk, DB, Redis, Qdrant, queues, and providers. No hardcoded status — only live probe results.',
  },
]

export default function PlatformPage() {
  return (
    <PublicShell>
      {/* Hero */}
      <section className="bg-[#050a12] py-24 text-white lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Platform</p>
          <h1 className="mt-5 max-w-5xl text-5xl font-black leading-[1.02] tracking-tight lg:text-7xl">
            One <span className="text-blue-400">AI</span> capability layer for all your apps.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            AmarktAI is a central AI orchestration layer. Apps request workflows and capabilities. The platform routes each request based on capability, quality, speed, cost, fallback, and live availability.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-20 text-slate-950 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">How it works</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight lg:text-5xl">
            Apps request. AmarktAI routes and executes.
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ['1', 'App sends request', 'App specifies a capability and workflow goal. No provider or model is selected by the app.'],
              ['2', 'Runtime routes', 'AmarktAI selects the right provider, model, quality tier, and fallback chain automatically.'],
              ['3', 'Result returned', 'Asset saved, approval state set, learning signal recorded. App receives result.'],
            ].map(([num, title, body]) => (
              <div key={num} className="rounded-2xl border border-slate-200 bg-slate-50 p-7">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">{num}</div>
                <h3 className="mt-5 text-lg font-black">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform pillars */}
      <section className="bg-slate-50 py-20 text-slate-950 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Platform pillars</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight lg:text-5xl">
            Everything your app needs. Nothing it shouldn&apos;t touch.
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pillars.map(({ icon: Icon, title, body }) => (
              <article key={title} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                <Icon className="h-6 w-6 text-blue-600" />
                <h2 className="mt-5 text-xl font-black">{title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Provider runtime */}
      <section className="bg-[#050a12] py-20 text-white lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Provider runtime</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight lg:text-5xl">
            Apps never choose providers or models.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
            The active platform providers handle all routing through the approved provider set.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-5">
            {[
              { name: 'GenX', role: 'Primary runtime', color: 'border-blue-500/40 text-blue-300' },
              { name: 'Hugging Face', role: 'Embeddings, music', color: 'border-yellow-500/40 text-yellow-300' },
              { name: 'Together AI', role: 'Image, text', color: 'border-purple-500/40 text-purple-300' },
              { name: 'Groq', role: 'Fast inference', color: 'border-emerald-500/40 text-emerald-300' },
              { name: 'MiMo', role: 'Text fallback', color: 'border-slate-500/40 text-slate-300' },
            ].map((p) => (
              <div key={p.name} className={`rounded-2xl border bg-white/5 p-5 ${p.color}`}>
                <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
                <p className={`mt-4 text-sm font-black ${p.color.split(' ')[1]}`}>{p.name}</p>
                <p className="mt-1 text-xs text-slate-400">{p.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-20 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h2 className="max-w-xl text-3xl font-black tracking-tight lg:text-5xl">Start with the outcome, not the tool.</h2>
            <p className="mt-3 max-w-xl text-base leading-7 text-blue-100">Launch your AI-powered marketing workflow, agent, or campaign from the AmarktAI dashboard.</p>
          </div>
          <Link href="/admin/login" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-black text-blue-700 shadow-lg transition hover:bg-blue-50">
            Open Dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PublicShell>
  )
}
