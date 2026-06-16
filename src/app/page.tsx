import Link from 'next/link'
import {
  ArrowRight,
  AudioLines,
  Brain,
  CheckCircle2,
  Command,
  FileText,
  Film,
  Image,
  Layers3,
  Lock,
  Music,
  Orbit,
  Puzzle,
  Search,
  Sparkles,
} from 'lucide-react'
import BrandName from '@/components/BrandName'
import PublicShell from '@/components/public/PublicShell'

const CAPABILITY_FAMILIES = [
  { icon: Brain, label: 'Research and reasoning', detail: 'Chat, structured research, synthesis, and capability-first planning.' },
  { icon: Image, label: 'Images and visual work', detail: 'Generate, edit, and route visual creation through approved backend capability paths.' },
  { icon: Film, label: 'Video orchestration', detail: 'Start truthful video flows, track long-running work, and keep pending work honest.' },
  { icon: AudioLines, label: 'Voice and audio', detail: 'Speech generation, transcription, and reusable voice outputs where runtime support exists.' },
  { icon: Music, label: 'Music and composition', detail: 'Coordinate music, lyrics, and audio artifacts without exposing infrastructure decisions.' },
  { icon: FileText, label: 'Artifacts and outputs', detail: 'Persist completed work as reusable artifacts tied to capabilities, jobs, and execution history.' },
] as const

const FLOW = [
  ['App requests a capability', 'Apps and operators ask for outcomes like research, media, or orchestration rather than picking providers.'],
  ['One Brain chooses the route', 'AmarktAI evaluates capability truth, policy, routing, and runtime readiness behind the scenes.'],
  ['Jobs and control-plane state stay visible', 'Long-running work remains visible as jobs, approvals, attempts, and progress instead of fake completion.'],
  ['Artifacts become reusable system outputs', 'Completed results are persisted, linked, and ready for later workflows across the network.'],
] as const

const CONTROL_PLANE_PANELS = [
  ['Research', 'Research requests route through the Brain and return structured outputs with source-aware artifacts where supported.', Search],
  ['Jobs', 'Queued, running, completed, and failed work stays visible in the control plane instead of disappearing behind provider calls.', Orbit],
  ['Artifacts', 'Completed outputs remain previewable, downloadable, and reusable across later tasks and connected apps.', Layers3],
  ['Command Center', 'Operators can inspect routes, approvals, execution progress, and results through one runtime-facing workspace.', Command],
] as const

export default function HomePage() {
  return (
    <PublicShell>
      <section className="relative overflow-hidden px-5 pb-24 pt-20 text-white lg:px-8 lg:pb-32 lg:pt-28">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="animate-fade-in-up">
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/8 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300">
              <Sparkles className="h-3.5 w-3.5" />
              AmarktAI Network
            </p>
            <h1 className="mt-8 max-w-5xl text-5xl font-black leading-[0.92] tracking-[-0.05em] text-white sm:text-6xl lg:text-[5.4rem]">
              One Brain for
              <span className="mt-2 block text-transparent [background-image:linear-gradient(120deg,#f8fbff_0%,#b4dcff_42%,#7dd3fc_100%)] bg-clip-text">
                research, media, jobs, artifacts, and connected apps.
              </span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
              <BrandName /> Network is the capability-first operating layer behind modern AI products. Apps ask for outcomes. The Brain selects the execution path, tracks work through the control plane, and keeps results reusable.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/platform" className="inline-flex items-center gap-2 rounded-full bg-cyan-300 px-6 py-3.5 text-sm font-black text-slate-950 shadow-[0_20px_45px_rgba(56,189,248,0.26)] transition hover:bg-cyan-200">
                Explore the platform <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/contact" className="rounded-full border border-white/12 bg-white/[0.04] px-6 py-3.5 text-sm font-black text-white transition hover:border-cyan-300/30 hover:bg-cyan-400/8">
                Talk to the team
              </Link>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[
                ['Capability-first routing', 'Apps request capabilities, not vendor-specific infrastructure.'],
                ['Truthful job state', 'Long-running work stays visible as jobs, attempts, and approvals.'],
                ['Reusable artifacts', 'Completed outputs remain connected to the Brain for later workflows.'],
              ].map(([title, detail]) => (
                <article key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <h2 className="text-sm font-black text-white">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="animate-fade-in-up [animation-delay:120ms]">
            <div className="public-preview-panel relative overflow-hidden rounded-[2rem] border border-white/10 p-6">
              <div className="flex items-center justify-between gap-4 border-b border-white/8 pb-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">Brain runtime</p>
                  <h2 className="mt-2 text-xl font-black text-white">One Brain. Many app requests.</h2>
                </div>
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-300">
                  Runtime foundation
                </span>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Incoming app requests</p>
                  <div className="mt-3 space-y-2">
                    {['research', 'image_generation', 'video_generation', 'scrape_website'].map((capability) => (
                      <div key={capability} className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.03] px-3 py-2">
                        <span className="font-mono text-[11px] text-slate-300">capability: {capability}</span>
                        <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-bold text-slate-400">queued for routing</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-cyan-400/12 bg-cyan-400/[0.045] p-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-cyan-300 text-slate-950 shadow-[0_0_30px_rgba(56,189,248,0.3)]">
                      <Brain className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">AmarktAI Brain</p>
                      <p className="text-xs text-slate-400">Capability routing, approvals, jobs, artifacts, and runtime truth.</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {['Capability truth', 'Policy checks', 'Route planning', 'Artifact persistence'].map((item) => (
                      <div key={item} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs font-bold text-slate-300">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Control-plane result</p>
                  <div className="mt-3 grid gap-2">
                    {[
                      ['Job', 'processing', 'long-running work stays visible'],
                      ['Artifact', 'completed', 'reusable output persisted'],
                      ['Approval', 'required when necessary', 'operators review before risky execution'],
                    ].map(([label, status, detail]) => (
                      <div key={label} className="rounded-xl border border-white/6 bg-white/[0.03] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-black text-white">{label}</p>
                          <span className="rounded-full border border-white/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-300">{status}</span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,#eff5fb_0%,#f7fbff_100%)] py-20 text-slate-950 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-700">Capability families</p>
              <h2 className="mt-3 max-w-3xl text-4xl font-black tracking-tight lg:text-5xl">
                A single product surface for many kinds of AI work.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-slate-600">
              The public product story stays capability-first. Providers remain behind-the-scenes infrastructure chosen by the Brain, not public workflow controls.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITY_FAMILIES.map(({ icon: Icon, label, detail }) => (
              <article key={label} className="rounded-[1.7rem] border border-slate-200/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:shadow-[0_26px_60px_rgba(15,23,42,0.1)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-black">{label}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,#07111f_0%,#07131f_100%)] py-20 text-white lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Brain workflow</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight lg:text-5xl">Apps ask for outcomes. The Brain does the coordination.</h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-400">
              The public workflow is deliberately simple. Request a capability, let the Brain resolve the route, and keep the control plane honest about readiness, approvals, jobs, and artifacts.
            </p>
          </div>
          <div className="space-y-3">
            {FLOW.map(([title, detail], index) => (
              <div key={title} className="flex gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 transition hover:border-cyan-300/20 hover:bg-cyan-400/[0.05]">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cyan-300 text-sm font-black text-slate-950 shadow-[0_0_24px_rgba(56,189,248,0.3)]">{index + 1}</span>
                <div>
                  <h3 className="font-black">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-400">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20 text-slate-950 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-700">Control plane</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight lg:text-5xl">Research, media, jobs, and artifacts stay connected.</h2>
              <p className="mt-5 text-base leading-8 text-slate-600">
                AmarktAI Network is not just a chat box. It is a Brain with runtime truth, reusable outputs, control-plane jobs, and app-scoped execution surfaces.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {CONTROL_PLANE_PANELS.map(([title, body, Icon]) => {
                const ItemIcon = Icon as typeof Brain
                return (
                  <article key={title as string} className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-cyan-300">
                      <ItemIcon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-lg font-black">{title as string}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{body as string}</p>
                  </article>
                )
              })}
            </div>
          </div>

          <div className="mt-14 grid gap-10 rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#edf5ff_100%)] p-8 lg:grid-cols-[1fr_0.95fr] lg:p-10">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-700">App ecosystem</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 lg:text-4xl">Many apps. One operating layer.</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                Connected apps request capabilities through signed, scoped calls. The Brain routes work, persists artifacts, and keeps operational state visible to the dashboard and control plane.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  ['Connected apps', 'Apps use scoped capabilities instead of raw provider integrations.'],
                  ['Control plane', 'Operators track runs, approvals, jobs, and artifacts in one place.'],
                  ['Truthful runtime', 'Unavailable work stays blocked or pending instead of pretending to succeed.'],
                  ['Reusable outputs', 'Completed results return as durable artifacts for later workflows.'],
                ].map(([title, detail]) => (
                  <div key={title} className="rounded-2xl border border-white/70 bg-white/80 p-4">
                    <h3 className="text-sm font-black text-slate-950">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_25px_60px_rgba(15,23,42,0.18)]">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Dashboard preview</p>
                  <p className="mt-1 text-sm font-black text-white">Control plane visibility</p>
                </div>
                <span className="rounded-full bg-white/8 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-300">Runtime truth</span>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  ['Command Center', 'Capability-first execution workspace'],
                  ['Studio', 'Creative operations, jobs, and artifacts'],
                  ['Jobs', 'Queued, running, completed, failed'],
                  ['Artifacts', 'Preview, reuse, download, traceability'],
                ].map(([label, detail]) => (
                  <div key={label} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
                    <div>
                      <p className="text-sm font-black text-white">{label}</p>
                      <p className="text-xs text-slate-400">{detail}</p>
                    </div>
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-300">connected</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--amarkt-ink)] px-5 pb-24 text-white lg:px-8 lg:pb-32">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/10 bg-white/[0.04] px-7 py-10 shadow-[0_24px_80px_rgba(0,0,0,0.3)] lg:px-10 lg:py-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Get started</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white lg:text-4xl">Use one Brain to power many workflows.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
                Explore the platform, review the operating model, or open the runtime-facing control plane.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/platform" className="inline-flex items-center gap-2 rounded-full bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200">
                Explore AmarktAI Network <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/admin/login" className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-black text-white transition hover:border-cyan-300/30 hover:bg-cyan-400/8">
                Open control plane
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
