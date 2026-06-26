import Link from 'next/link'
import { ArrowRight, Bot, Briefcase, Headphones, Megaphone, Microscope, PenTool, Search, Workflow } from 'lucide-react'
import PublicShell from '@/components/public/PublicShell'

const outcomes = [
  ['Marketing apps', 'Scrape a site, extract brand context, plan campaigns, generate items, route approvals, and store assets.', Megaphone],
  ['Creator platforms', 'Coordinate image, video, music, audio, avatar, and document outputs through governed capability requests.', PenTool],
  ['Companion apps', 'Use app-scoped memory, safety settings, and response controls while keeping the app interface thin.', Bot],
  ['Automation tools', 'Turn repeated operational work into queued jobs, artifacts, approvals, and learning signals.', Workflow],
  ['Research workflows', 'Gather sources, summarize findings, store knowledge, and test retrieval from one workspace.', Search],
  ['Customer service', 'Connect context, brand memory, permissions, and response governance for support experiences.', Headphones],
  ['Business apps', 'Give internal systems access to AI capabilities without making every app own routing and storage.', Briefcase],
  ['Product research', 'Prototype capability mixes, inspect proof, and decide what deserves production wiring.', Microscope],
] as const

export default function WhatWeCanDoPage() {
  return (
    <PublicShell>
      <section className="architecture-band pb-20 pt-24 lg:pb-28 lg:pt-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-blue-300">What We Can Do</p>
          <h1 className="mt-5 max-w-5xl text-5xl font-semibold leading-tight text-balance text-white lg:text-7xl">
            Turn app ideas into governed AI capability workflows.
          </h1>
          <p className="mt-7 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
            AmarktAI Network is built for teams that need AI-powered apps, media workflows, research systems, automation, and operational control from one runtime.
          </p>
        </div>
      </section>

      <section className="bg-[#03050a] py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {outcomes.map(([title, body, Icon]) => (
            <article key={title} className="rounded-lg border border-white/10 bg-slate-950/70 p-6">
              <Icon className="h-6 w-6 text-cyan-300" />
              <h2 className="mt-5 text-lg font-black text-white">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#071019] py-20 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[0.2em] text-cyan-300">How it works</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight lg:text-5xl">Apps request capabilities. The runtime handles the operating burden.</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {['Context', 'Capability', 'Budget', 'Quality', 'Permissions', 'Storage', 'Approvals', 'Learning'].map((item) => (
              <div key={item} className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm font-black text-slate-200">{item}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-cyan-400 py-16 text-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h2 className="text-3xl font-black tracking-tight lg:text-5xl">Bring the app. Keep the AI layer central.</h2>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-800">
              Build marketing, creator, companion, automation, research, customer service, and business apps on one capability platform.
            </p>
          </div>
          <Link href="/contact" className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-900">
            Contact Us <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PublicShell>
  )
}
