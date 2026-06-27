import Link from 'next/link'
import {
  ArrowRight,
  Boxes,
  Database,
  FileImage,
  Lock,
  Network,
  RadioTower,
  Route,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
  WandSparkles,
} from 'lucide-react'
import BrandName from '@/components/BrandName'
import IntelligenceFabric from '@/components/public/IntelligenceFabric'
import PublicShell from '@/components/public/PublicShell'

const runtimeSteps = [
  ['01', 'Request', 'App context, workspace, brand, memory, and requested capability'],
  ['02', 'Policy', 'Budget, quality, permissions, safety, and approval rules'],
  ['03', 'Routing', 'Runtime route, fallback, latency, and cost decision'],
  ['04', 'Execution', 'Approved execution path and clear failures'],
  ['05', 'Artifact', 'Stored output, proof, approval state, learning signal'],
]

const platformLayers = [
  { icon: Network, title: 'Runtime execution network', body: 'Apps ask for outcomes while the runtime handles routing, fallback, quality, budget, and evidence.' },
  { icon: Database, title: 'Memory, RAG, and storage', body: 'Brand memory, retrieval context, artifacts, approvals, and local VPS storage sit behind a shared platform boundary.' },
  { icon: Users, title: 'Agent layer', body: 'Marketing, creator, customer service, research, and automation agents request capabilities from the same runtime.' },
  { icon: ShieldCheck, title: 'Operational gates', body: 'Health, configuration, storage, worker queues, approvals, and safety states are shown honestly in the control centre.' },
]

const appCategories = [
  'Marketing',
  'Creator',
  'Automation',
  'Research',
  'Customer service',
  'Business ops',
  'Media studio',
]

export default function HomePage() {
  return (
    <PublicShell>
      <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-[#03050a]">
        <div className="absolute inset-0">
          <IntelligenceFabric className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(3,5,10,0.96),rgba(3,5,10,0.78)_42%,rgba(3,5,10,0.2)_78%),linear-gradient(180deg,rgba(3,5,10,0)_72%,#03050a)]" />
        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center px-5 py-20 lg:px-8">
          <div className="max-w-4xl">
            <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
              Central <span className="text-blue-300">AI</span> capability platform
            </p>
            <h1 className="mt-5 max-w-4xl text-5xl font-black leading-none tracking-tight text-white sm:text-6xl lg:text-8xl">
              Intelligence Unleashed.
            </h1>
            <p className="mt-6 max-w-3xl text-xl font-semibold leading-8 text-slate-100 sm:text-2xl">
              Explore Infinite Intelligence. The Future is <BrandName />.
            </p>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
              Apps stay thin. They request capabilities. AmarktAI chooses the providers/capabilities path, route, fallback, budget, quality, permissions, storage, memory, RAG, artifacts, approvals, and learning path.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/admin/login" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-[0_0_28px_rgba(37,99,235,0.28)] transition hover:bg-blue-500">
                Launch your AI workflow <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/features" className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/8 px-5 py-3 text-sm font-black text-white backdrop-blur-md transition hover:border-cyan-300/40 hover:bg-white/12">
                Explore features
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#050912] py-16 text-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {platformLayers.map(({ icon: Icon, title, body }) => (
            <article key={title} className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
              <Icon className="h-6 w-6 text-cyan-300" />
              <h2 className="mt-5 text-lg font-black text-white">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="runtime-workflow" className="bg-[#03050a] py-20 text-white lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="max-w-4xl">
            <p className="font-mono text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Runtime workflow</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight lg:text-6xl">
              One request becomes a routed, stored, reviewable result.
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-400">
              The platform owns the execution path so each app can focus on the user workflow instead of routing contracts, keys, quotas, execution rules, and output persistence.
            </p>
          </div>
          <div className="mt-12 grid gap-3 lg:grid-cols-5">
            {[
              ...runtimeSteps,
              ['06', 'Review', 'Approval state and human gates'],
              ['07', 'Publish / export', 'Publish, download, or reference stored output'],
              ['08', 'Measure', 'Usage, campaign, and quality signals'],
              ['09', 'Improve', 'Learning signals for future runs'],
            ].map(([step, title, body]) => (
              <div key={step} className="rounded-lg border border-white/10 bg-slate-950/70 p-5">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">{step}</p>
                <p className="mt-4 text-sm font-black text-white">{title}</p>
                <p className="mt-2 text-xs leading-6 text-slate-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="capabilities" className="bg-[#071019] py-20 text-white lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="font-mono text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Capability console</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight lg:text-5xl">
                The app asks for capability. Runtime does the rest.
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-400">
                AmarktAI supports text, research, image, video, music, audio, avatars, documents, agents, Brand Memory, retrieval, approvals, publishing, and campaign workflows through one control layer.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                [WandSparkles, 'Text and reasoning'],
                [FileImage, 'Image artifacts'],
                [Video, 'Video generation'],
                [RadioTower, 'Music and audio'],
                [Sparkles, 'Agents and automation'],
                [Boxes, 'Documents and stored outputs'],
                [Route, 'Routing and fallback'],
                [Lock, 'Permissions and approvals'],
              ].map(([Icon, label]) => {
                const CapabilityIcon = Icon as typeof Sparkles
                return (
                  <div key={String(label)} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-4">
                    <CapabilityIcon className="h-5 w-5 text-cyan-300" />
                    <span className="text-sm font-bold text-slate-200">{String(label)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#03050a] py-20 text-white lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-mono text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Applications</p>
              <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight lg:text-5xl">
                Built for every thin app that needs heavy AI infrastructure.
              </h2>
            </div>
            <Link href="/what-we-can-do" className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/8 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/12">
              View app layer <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {appCategories.map((item) => (
              <div key={item} className="rounded-lg border border-white/10 bg-slate-950/70 px-4 py-5">
                <p className="text-sm font-black text-white">{item}</p>
                <p className="mt-2 text-xs leading-6 text-slate-500">Requests capabilities from the shared runtime.</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="governance" className="bg-[#071019] py-20 text-white lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:px-8">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Execution governance</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight lg:text-5xl">
              Clear routing, permission gates, and proof after execution.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-400">
              The public site describes the capability platform. The admin control centre shows configuration, route state, storage, worker status, failures, and proof from real runtime data.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {['Configured or unconfigured', 'Requires endpoint', 'Requires verification', 'Working or failed'].map((state) => (
              <div key={state} className="rounded-lg border border-cyan-300/15 bg-cyan-300/[0.06] p-4">
                <div className="h-2 w-2 rounded-full bg-cyan-300" />
                <p className="mt-4 text-sm font-black text-white">{state}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="safety" className="bg-[#03050a] py-16 text-white">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="font-mono text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Safety</p>
          <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight">Permission-gated and safety-controlled where required.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400">
            Sensitive capability requests require app permission, policy checks, and approved runtime routes before execution.
          </p>
        </div>
      </section>

      <section className="bg-cyan-400 py-16 text-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h2 className="text-3xl font-black tracking-tight lg:text-5xl">Your AI-powered workflow starts here.</h2>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-800">
              Routing, memory, media generation, storage, approvals, and learning stay centralized.
            </p>
          </div>
          <Link href="/admin/login" className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-900">
            Open dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PublicShell>
  )
}
