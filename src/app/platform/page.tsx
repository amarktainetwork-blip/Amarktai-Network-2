import Link from 'next/link'
import { ArrowRight, Command, Library, ShieldCheck } from 'lucide-react'
import PublicShell from '@/components/public/PublicShell'

const capabilities = [
  ['Command', 'Describe the outcome once. Amarktai routes the work and keeps the next step clear.', Command],
  ['Outputs', 'Media, research, app builds, reports, diffs, and pull requests remain available as durable work.', Library],
  ['Runtime truth', 'Readiness, warnings, approvals, and blocked states stay visible in plain English.', ShieldCheck],
] as const

export default function PlatformPage() {
  return (
    <PublicShell>
      <section className="architecture-band py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">Platform</p>
          <h1 className="mt-5 max-w-5xl text-4xl font-black leading-tight text-white sm:text-5xl lg:text-7xl">One command layer from request to verified result.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">Amarktai Network brings connected apps, agents, media, workflows, repo work, outputs, and runtime readiness into one understandable operating experience.</p>
        </div>
      </section>
      <section className="bg-[var(--amarkt-obsidian)] py-20">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 md:grid-cols-3 lg:px-8">
          {capabilities.map(([title, body, Icon]) => (
            <article key={title} className="premium-panel rounded-2xl p-7">
              <Icon className="h-6 w-6 text-cyan-200" />
              <h2 className="mt-6 text-2xl font-black text-white">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">{body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="bg-[var(--amarkt-black)] py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <h2 className="max-w-4xl text-4xl font-black text-white">Start with the outcome, not the tool.</h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">Create media, build an app, audit a repository, prepare a PR, check the VPS, or repair a connected app from the same private command experience.</p>
          <Link href="/admin/login" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950">Open private access <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>
    </PublicShell>
  )
}
