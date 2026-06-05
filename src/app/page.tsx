import Link from 'next/link'
import { ArrowRight, CheckCircle2, Command, Layers3, ShieldCheck } from 'lucide-react'
import PublicShell from '@/components/public/PublicShell'
import IntelligenceFabric from '@/components/public/IntelligenceFabric'
import BrandName from '@/components/BrandName'

const sections = [
  {
    title: 'What Amarktai Network is',
    body: 'Amarktai Network is the AI operating system for connected digital businesses. It turns an outcome into coordinated work across apps, agents, media, workflows, and business modules.',
    icon: Layers3,
  },
  {
    title: 'One command window',
    body: 'Describe what you want to create, repair, research, build, monitor, or launch. Amarktai selects the right capability and keeps the next step visible.',
    icon: Command,
  },
  {
    title: 'Connected apps',
    body: 'Marketing, research, content, automation, sales, support, finance, retail, and operations can share useful context without pretending unfinished modules are live.',
    icon: CheckCircle2,
  },
  {
    title: 'Create media, apps, and workflows',
    body: 'Create songs, video, avatars, images, apps, and repeatable workflows while keeping outputs, approvals, and progress together.',
    icon: Layers3,
  },
  {
    title: 'Work on repos and PRs',
    body: 'Audit a repository, plan a fix, review a diff, run checks, and prepare a pull request through a guarded workflow.',
    icon: Command,
  },
  {
    title: 'Runtime truth',
    body: 'Ready means verified. Needs setup stays visible. Unknown states are never painted green just to make the dashboard look complete.',
    icon: ShieldCheck,
  },
]

export default function HomePage() {
  return (
    <PublicShell>
      <section className="relative min-h-[690px] overflow-hidden bg-[var(--amarkt-obsidian)]">
        <div className="absolute inset-0 opacity-90"><IntelligenceFabric className="h-full w-full" /></div>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(3,5,10,.97)_0%,rgba(3,5,10,.78)_35%,rgba(3,5,10,.2)_66%,rgba(3,5,10,.05)_100%),linear-gradient(180deg,rgba(3,5,10,.1),rgba(3,5,10,.02)_62%,#03050a)]" />
        <div className="relative z-10 mx-auto flex min-h-[690px] max-w-7xl items-start px-5 pt-14 sm:pt-16 lg:px-8 lg:pt-20">
          <div className="max-w-2xl py-5 [text-shadow:0_2px_24px_rgba(0,0,0,.9)]">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">Plan · Build · Launch · Improve</p>
            <h1 className="mt-5 text-5xl font-black leading-[.98] tracking-[-0.045em] text-white drop-shadow-[0_0_32px_rgba(34,211,238,.14)] sm:text-6xl lg:text-7xl"><BrandName /></h1>
            <p className="mt-6 max-w-2xl text-xl font-semibold leading-8 text-slate-100 sm:text-2xl">The AI operating system for connected digital businesses.</p>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200">Plan, build, launch, monitor, and improve apps, agents, media, workflows, and business modules from one intelligent command layer.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/platform" className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950">Explore the platform <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/admin/login" className="rounded-xl border border-white/20 bg-slate-950/55 px-5 py-3 text-sm font-black text-white backdrop-blur-md hover:border-cyan-300/40">Login</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="architecture-band py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="max-w-4xl text-3xl font-black leading-tight text-white lg:text-5xl">A calm command layer for work that moves from idea to verified outcome.</p>
        </div>
      </section>

      <section className="bg-[var(--amarkt-obsidian)] py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 md:grid-cols-2 lg:px-8">
          {sections.map(({ title, body, icon: Icon }, index) => (
            <article key={title} className="premium-panel rounded-2xl p-6 lg:p-8">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200"><Icon className="h-5 w-5" /></span>
                <span className="font-mono text-xs font-bold text-cyan-200">0{index + 1}</span>
              </div>
              <h2 className="mt-6 text-2xl font-black text-white">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[linear-gradient(135deg,#071b2b,#03050a)] py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Private access</p>
          <h2 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-white lg:text-6xl">One place to command the network and see what is true.</h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200">Connected apps, active work, recent outputs, warnings, and runtime readiness stay visible without exposing backend clutter.</p>
          <Link href="/admin/login" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950">Open private access <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>
    </PublicShell>
  )
}
