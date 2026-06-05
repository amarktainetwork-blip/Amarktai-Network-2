import Link from 'next/link'
import { ArrowRight, Bot, Boxes, BrainCircuit, Command, Library, Network, ShieldCheck } from 'lucide-react'
import PublicShell from '@/components/public/PublicShell'

const capabilities = [
  ['One command window', 'Describe the outcome once. Amarktai understands the intent, asks only for missing details, and starts the right capability.', Command],
  ['Provider mesh', 'Live-tested providers are selected by capability, with honest fallbacks and sanitized errors when work cannot start.', Network],
  ['Connected apps', 'Business modules share outputs, context, events, and useful outcomes without pretending planned work is live.', Boxes],
  ['Agents', 'Specialist teams coordinate creative, repository, research, app-building, and operating work behind the command layer.', Bot],
  ['Memory', 'Preferences, app context, outputs, and learned outcomes remain available for later work.', BrainCircuit],
  ['Outputs', 'Media, research, app builds, reports, repository diffs, and pull requests stay together.', Library],
  ['Hidden monitoring', 'Provider setup and technical system monitoring stay in Settings and System, not in the normal workflow.', ShieldCheck],
] as const

export default function PlatformPage() {
  return (
    <PublicShell>
      <section className="bg-[#050a12] py-24 text-white lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Platform</p>
          <h1 className="mt-5 max-w-5xl text-5xl font-black leading-[1.02] tracking-tight lg:text-7xl">One command layer from request to verified result.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">Amarktai Network coordinates apps, agents, providers, memory, outputs, repository work, and operating workflows in one understandable experience.</p>
        </div>
      </section>
      <section className="bg-white py-20 text-slate-950 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 md:grid-cols-2 lg:px-8">
          {capabilities.map(([title, body, Icon]) => <article key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-7"><Icon className="h-6 w-6 text-cyan-600" /><h2 className="mt-6 text-2xl font-black">{title}</h2><p className="mt-3 text-sm leading-7 text-slate-600">{body}</p></article>)}
        </div>
      </section>
      <section className="bg-cyan-50 py-20 text-slate-950">
        <div className="mx-auto max-w-7xl px-5 lg:px-8"><h2 className="max-w-4xl text-4xl font-black">Start with the outcome, not the tool.</h2><p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">Create media, build an app, audit a repository, prepare a pull request, check the VPS, or repair a connected app from the same private command experience.</p><Link href="/admin/login" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Open private access <ArrowRight className="h-4 w-4" /></Link></div>
      </section>
    </PublicShell>
  )
}
