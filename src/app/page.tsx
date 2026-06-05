import Link from 'next/link'
import { ArrowRight, Boxes, BrainCircuit, CheckCircle2, Command, Film, GitPullRequest, Layers3, Rocket, Wrench } from 'lucide-react'
import PublicShell from '@/components/public/PublicShell'
import IntelligenceFabric from '@/components/public/IntelligenceFabric'
import BrandName from '@/components/BrandName'
import { NETWORK_APPS } from '@/lib/network-apps-registry'

export default function HomePage() {
  return (
    <PublicShell>
      <section className="relative min-h-[720px] overflow-hidden bg-[#03050a]">
        <div className="absolute inset-0 opacity-95"><IntelligenceFabric className="h-full w-full" /></div>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(3,5,10,.97)_0%,rgba(3,5,10,.78)_38%,rgba(3,5,10,.16)_72%,rgba(3,5,10,.03)_100%),linear-gradient(180deg,transparent_65%,#03050a)]" />
        <div className="relative z-10 mx-auto flex min-h-[720px] max-w-7xl items-center px-5 py-20 lg:px-8">
          <div className="max-w-3xl [text-shadow:0_2px_24px_rgba(0,0,0,.9)]">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">One intelligent command layer</p>
            <h1 className="mt-5 text-5xl font-black leading-[.96] tracking-[-0.05em] text-white sm:text-6xl lg:text-8xl"><BrandName /></h1>
            <p className="mt-6 text-xl font-bold leading-8 text-slate-100 sm:text-2xl">The AI operating system for connected digital businesses.</p>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200">Plan, build, launch, monitor, and improve apps, agents, media, workflows, and business modules from one intelligent command layer.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/admin/login" className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950">Open Command <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/platform" className="rounded-xl border border-white/20 bg-slate-950/55 px-5 py-3 text-sm font-black text-white backdrop-blur-md">Explore the platform</Link>
            </div>
          </div>
        </div>
      </section>

      <LightSection eyebrow="What Amarktai Network is" title="Tell Amarktai Network what you want to create, fix, launch, or monitor.">
        <p className="max-w-3xl text-lg leading-8 text-slate-600">It chooses the right agents, models, tools, and workflow, then keeps the work, approvals, outputs, and next step together.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <LightCard icon={<Command />} title="Describe the outcome" body="Use natural language instead of learning a different control panel for every capability." />
          <LightCard icon={<Layers3 />} title="Coordinate the work" body="Creative, repository, app, research, and operating tasks move through one clear flow." />
          <LightCard icon={<CheckCircle2 />} title="See what is true" body="Connected means a live test passed. Missing setup stays clear without fake green lights." />
        </div>
      </LightSection>

      <section className="bg-cyan-50 py-20 text-slate-950 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">One command window</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight lg:text-6xl">Start with what you want done.</h2>
            <p className="mt-5 text-base leading-8 text-slate-600">Amarktai Network asks only for missing information, selects tested capabilities, and starts the right job or guarded workspace.</p>
          </div>
          <div className="rounded-3xl border border-cyan-200 bg-white p-5 shadow-[0_30px_90px_rgba(8,145,178,.14)]">
            <div className="rounded-2xl bg-slate-950 p-5 text-white">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Command</p>
              <p className="mt-5 text-lg font-bold">Create a 3 minute rock, pop, and rasta song with female vocals.</p>
              <div className="mt-6 grid gap-2 sm:grid-cols-3">
                {['Intent understood', 'Live provider selected', 'Song job started'].map((item) => <div key={item} className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs font-bold text-slate-300">{item}</div>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <LightSection eyebrow="From idea to operation" title="Plan, build, launch, monitor, and improve.">
        <div className="grid gap-4 md:grid-cols-5">
          {[
            ['Plan', BrainCircuit],
            ['Build', Wrench],
            ['Launch', Rocket],
            ['Monitor', Boxes],
            ['Improve', CheckCircle2],
          ].map(([label, Icon]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><Icon className="h-6 w-6 text-cyan-600" /><p className="mt-6 font-black">{String(label)}</p></div>)}
        </div>
      </LightSection>

      <section className="bg-slate-100 py-20 text-slate-950 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">Connected apps</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight lg:text-6xl">Your apps share memory, outputs, and learning.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {NETWORK_APPS.slice(0, 6).map((app) => <div key={app.slug} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between gap-3"><h3 className="font-black">{app.displayName}</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black">{app.status}</span></div><p className="mt-3 text-sm leading-6 text-slate-600">{app.purpose}</p></div>)}
          </div>
        </div>
      </section>

      <section className="bg-[#050a12] py-20 text-white lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Create media, apps, and workflows</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight lg:text-6xl">Media, apps, workflows, and repository fixes from the same command layer.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <DarkCard icon={<Film />} title="Media" body="Create songs, images, movies, avatars, and voices with real provider jobs and saved outputs." />
            <DarkCard icon={<GitPullRequest />} title="Repositories" body="Audit code, prepare a fix, review a diff, run checks, and create a pull request with approval." />
            <DarkCard icon={<Rocket />} title="Apps and workflows" body="Plan and build apps, coordinate automations, and hand off deployment through guarded steps." />
          </div>
        </div>
      </section>

      <LightSection eyebrow="Runtime truth" title="Setup details stay where they belong.">
        <p className="max-w-3xl text-lg leading-8 text-slate-600">Add your keys once, test them, and the connected capabilities become available across Command, media, repository work, App Builder, Network Apps, and Outputs. Technical diagnostics remain in Settings and System.</p>
      </LightSection>

      <section className="bg-cyan-300 py-20 text-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div><p className="text-sm font-black uppercase tracking-[0.16em]">Amarktai Network</p><h2 className="mt-3 text-4xl font-black tracking-tight">One command layer. Connected work. Honest results.</h2></div>
          <Link href="/admin/login" className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Open private access <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>
    </PublicShell>
  )
}

function LightSection({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <section className="bg-white py-20 text-slate-950 lg:py-28"><div className="mx-auto max-w-7xl px-5 lg:px-8"><p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">{eyebrow}</p><h2 className="mt-4 max-w-5xl text-4xl font-black tracking-tight lg:text-6xl">{title}</h2><div className="mt-8">{children}</div></div></section>
}

function LightCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="h-6 w-6 text-cyan-600">{icon}</div><h3 className="mt-6 text-xl font-black">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{body}</p></article>
}

function DarkCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return <article className="rounded-2xl border border-white/10 bg-white/5 p-6"><div className="h-6 w-6 text-cyan-300">{icon}</div><h3 className="mt-6 text-xl font-black">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-300">{body}</p></article>
}
