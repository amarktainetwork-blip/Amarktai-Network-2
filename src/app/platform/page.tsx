import Link from 'next/link'
import { ArrowRight, Brain, Command, Library, Orbit, Puzzle, ShieldCheck, Sparkles } from 'lucide-react'
import BrandName from '@/components/BrandName'
import PublicShell from '@/components/public/PublicShell'

const workflow = [
  ['Apps request capabilities', 'Public and connected product workflows begin with capability requests such as research, image generation, or website scraping.'],
  ['The Brain resolves the route', 'AmarktAI evaluates capability truth, routing policy, available backend paths, and current runtime readiness behind the scenes.'],
  ['The control plane tracks work', 'Approvals, job state, provider attempts, and artifacts are recorded instead of hidden behind a black box.'],
  ['Completed outputs stay reusable', 'Artifacts remain available for preview, download, and later workflows across apps and operators.'],
] as const

const platformSurfaces = [
  ['Command Center', 'Describe an outcome, inspect the capability plan, approve sensitive work, and follow execution.', Command],
  ['Studio', 'Create image, video, music, voice, and other outputs through capability-first controls.', Sparkles],
  ['Connected Apps', 'Give registered products scoped access to AmarktAI capabilities with signed requests.', Puzzle],
  ['Artifacts', 'Keep completed outputs available for preview, download, and reuse.', Library],
  ['Truthful operation', 'Unavailable and unconfigured work is reported honestly instead of appearing successful.', ShieldCheck],
] as const

export default function PlatformPage() {
  return (
    <PublicShell>
      <section className="relative overflow-hidden px-5 py-24 text-white lg:px-8 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Platform</p>
          <h1 className="mt-5 max-w-5xl text-5xl font-black leading-[1.02] tracking-tight lg:text-7xl">
            <BrandName /> Network is one capability layer from request to result.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Apps ask for outcomes. The Brain chooses providers, models, and endpoints behind the scenes, then tracks jobs, approvals, artifacts, and runtime truth through one control plane.
          </p>
        </div>
      </section>
      <section className="bg-white py-20 text-slate-950 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-700">Capability-first architecture</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight lg:text-5xl">The Brain is the product surface. Infrastructure stays behind it.</h2>
              <p className="mt-5 text-base leading-8 text-slate-600">
                Public product flows should never require people to think in providers, model IDs, or endpoints. AmarktAI keeps that complexity inside the Brain and exposes a capability-first system to apps and operators.
              </p>
            </div>
            <div className="space-y-3 rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
              {workflow.map(([title, body], index) => (
                <div key={title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-950 text-sm font-black text-cyan-300">{index + 1}</span>
                  <div>
                    <h3 className="text-sm font-black text-slate-950">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {platformSurfaces.map(([title, body, Icon]) => (
              <article key={title} className="rounded-[1.6rem] border border-slate-200 bg-white p-7 shadow-[0_20px_45px_rgba(15,23,42,0.05)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="mt-6 text-2xl font-black">{title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
              </article>
            ))}
            <article className="rounded-[1.6rem] border border-slate-200 bg-slate-950 p-7 text-white shadow-[0_25px_60px_rgba(15,23,42,0.16)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-cyan-300">
                <Brain className="h-6 w-6" />
              </div>
              <h2 className="mt-6 text-2xl font-black">One Brain</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                The Brain owns routing, research, artifacts, job state, approvals, and truth surfaces. The dashboard reflects that runtime truth rather than inventing a parallel product model.
              </p>
            </article>
          </div>
        </div>
      </section>
      <section className="bg-[linear-gradient(180deg,#06101a_0%,#0a1320_100%)] py-20 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Runtime surfaces</p>
            <h2 className="mt-3 max-w-4xl text-4xl font-black">Research, media, jobs, and artifacts move through one operating layer.</h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-400">
              V1 is already grounded in capability routing, control-plane jobs, research artifacts, and reusable outputs. The public site should communicate the operating model clearly without pretending every workflow is fully live-proven.
            </p>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            {[
              ['Research', 'Capability-level research and scrape flows route through the Brain.'],
              ['Media', 'Image, video, music, and voice flows stay tied to jobs and artifact truth.'],
              ['Jobs', 'Long-running work remains visible with honest status.'],
              ['Artifacts', 'Completed outputs stay reusable across the network.'],
            ].map(([label, body]) => (
              <div key={label} className="flex items-start gap-4 border-b border-white/8 py-4 last:border-b-0 last:pb-0 first:pt-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
                  <Orbit className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{label}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-400">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-cyan-50 py-20 text-slate-950">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <h2 className="max-w-4xl text-4xl font-black">Start with the outcome. Let the Brain handle the route.</h2>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/admin/login" className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white">
              Open AmarktAI <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/contact" className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-3 text-sm font-black text-slate-950">
              Talk to us
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
