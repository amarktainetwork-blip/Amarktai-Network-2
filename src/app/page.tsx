import Link from 'next/link'
import PublicShell from '@/components/public/PublicShell'
import CommandConstellationScene from '@/components/public/CommandConstellationScene'
import { SectionInner, SectionWrap, SurfaceCard } from '@/components/public/PublicSection'

const commandNodes = [
  { label: 'Studio',      body: 'Multimodal execution across chat, research, image, video, audio, and artifact workflows with full provider intelligence.' },
  { label: 'Workbench',   body: 'Instruction to shipped change: prompt → plan → patch → checks → PR → deploy, with operator review at every step.' },
  { label: 'Apps & Agents', body: 'Purpose-built agent packs per application — coding, audit, deployment, research, operations, and safety.' },
  { label: 'Memory',      body: 'Persistent operational memory that compounds context, improves routing decisions, and sharpens each future cycle.' },
  { label: 'Operations',  body: 'Runtime truth for queues, approvals, provider health, storage, deployment status, and workload execution.' },
  { label: 'Settings',    body: 'Policy controls, model routing guardrails, and governance surfaces that keep autonomous actions safe and reviewable.' },
]

const commandSignals = [
  { label: 'Model Routing',          desc: 'Intelligent dispatch to the right provider for each task type and context.' },
  { label: 'Provider Orchestration', desc: 'Parallel and sequential coordination across multiple AI providers.' },
  { label: 'Approval Gates',         desc: 'Human-in-the-loop controls on high-impact actions before execution.' },
  { label: 'Artifact Pipeline',      desc: 'Structured output generation, storage, and downstream delivery.' },
  { label: 'Memory Integration',     desc: 'Operational context persisted and retrieved across every session.' },
  { label: 'Execution Logging',      desc: 'Complete traceability from instruction to deployed result.' },
]

const appMesh = [
  'App-specific agent orchestration',
  'Workflow automation pipelines',
  'Memory-informed decision loops',
  'Continuous approval flows',
  'Deployment confidence controls',
  'Cross-app signal propagation',
]

const workbenchFlow = ['Prompt', 'Plan', 'Patch', 'Checks', 'PR', 'Deploy']

export default function HomePage() {
  return (
    <PublicShell>
      {/* HERO */}
      <section className="relative flex min-h-[92vh] items-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <CommandConstellationScene variant="hero" className="h-full w-full opacity-80" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#020612]/20 via-transparent to-[#020612]/70" />
        <SectionInner className="relative z-10 py-24 lg:py-32">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-300">Private AI Operations Layer</p>
            <h1 className="mt-5 text-5xl font-black leading-[1.04] tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
              A private AI operations layer for building, running, and improving digital systems.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
              AmarktAI Network routes intelligence, coordinates agents, builds artifacts, and delivers decisive actions through one controlled Command Layer.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/apps"
                className="rounded-2xl bg-white px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-100"
              >
                Explore the system
              </Link>
              <Link
                href="/contact"
                className="rounded-2xl border border-white/15 bg-white/[0.02] px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.06]"
              >
                Request restricted briefing
              </Link>
            </div>
            <p className="mt-5 text-xs uppercase tracking-[0.18em] text-slate-500">
              Type <span className="text-slate-400">&ldquo;login&rdquo;</span> to open restricted operator access.
            </p>
          </div>
        </SectionInner>
      </section>

      {/* COMMAND LAYER */}
      <SectionWrap>
        <SectionInner>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Command Layer</p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">
            Orchestration intelligence at every layer.
          </h2>
          <p className="mt-5 max-w-3xl text-lg text-slate-300">
            Signals move through a live orchestration system — routing models, coordinating providers, gating approvals, persisting memory, and returning artifacts through one traceable execution path.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {commandSignals.map((signal) => (
              <SurfaceCard key={signal.label}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">{signal.label}</p>
                <p className="mt-3 text-sm leading-7 text-slate-400">{signal.desc}</p>
              </SurfaceCard>
            ))}
          </div>
        </SectionInner>
      </SectionWrap>

      {/* STUDIO */}
      <SectionWrap>
        <SectionInner className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Studio</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">
              Multimodal execution in one workspace.
            </h2>
            <p className="mt-5 text-lg text-slate-300">
              Chat, research, image, video, audio, and artifact generation run in the same operator environment. Every output is grounded in provider-aware runtime truth.
            </p>
          </div>
          <div className="grid gap-3">
            {['Chat & Research', 'Image Generation', 'Video Creation', 'Audio & Voice', 'Artifact Delivery', 'Provider Routing'].map((cap) => (
              <div key={cap} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                <span className="text-sm font-medium text-slate-200">{cap}</span>
              </div>
            ))}
          </div>
        </SectionInner>
      </SectionWrap>

      {/* WORKBENCH */}
      <SectionWrap>
        <SectionInner>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Workbench</p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">
            From instruction to deployed change.
          </h2>
          <p className="mt-5 max-w-3xl text-lg text-slate-300">
            A controlled pipeline that takes a plain-language instruction through planning, patch generation, automated checks, pull request creation, and deployment — with operator review gates built in.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-0">
            {workbenchFlow.map((step, i) => (
              <div key={step} className="flex items-center">
                <div className="rounded-2xl border border-white/15 bg-white/[0.05] px-5 py-3 text-sm font-bold uppercase tracking-[0.14em] text-slate-200">
                  {step}
                </div>
                {i < workbenchFlow.length - 1 && (
                  <div className="mx-1 h-px w-6 bg-gradient-to-r from-cyan-400/60 to-blue-400/40 sm:w-8" />
                )}
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Safety first', desc: 'Checks run before any commit is created.' },
              { label: 'Operator control', desc: 'Approve or reject at every handoff point.' },
              { label: 'Full traceability', desc: 'Every step logged from prompt to production.' },
            ].map((item) => (
              <SurfaceCard key={item.label}>
                <p className="text-sm font-black text-white">{item.label}</p>
                <p className="mt-2 text-xs text-slate-400">{item.desc}</p>
              </SurfaceCard>
            ))}
          </div>
        </SectionInner>
      </SectionWrap>

      {/* APPS & AGENTS */}
      <SectionWrap>
        <SectionInner>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Apps & Agents</p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">
            Every app orchestrated as one mesh.
          </h2>
          <p className="mt-5 max-w-3xl text-lg text-slate-300">
            Applications connect into a single command network. Specialist agents attach to each product surface, sharing memory, receiving instructions, and coordinating deployments through one governed layer.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {appMesh.map((item) => (
              <SurfaceCard key={item}>
                <p className="text-sm font-semibold text-slate-200">{item}</p>
              </SurfaceCard>
            ))}
          </div>
        </SectionInner>
      </SectionWrap>

      {/* MEMORY & LEARNING */}
      <SectionWrap>
        <SectionInner className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Memory & Learning</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">
              Operational memory that compounds.
            </h2>
            <p className="mt-5 text-lg text-slate-300">
              The system maintains persistent knowledge across sessions — remembering production context, tracking outcomes, adapting model routing, and improving decision quality with every completed operation.
            </p>
          </div>
          <div className="grid gap-3">
            {[
              { label: 'Session Memory',       desc: 'Context carried across all workspace interactions.' },
              { label: 'Historical Awareness', desc: 'Past decisions inform current routing and agent behavior.' },
              { label: 'Routing Adaptation',   desc: 'Model selection refined based on observed outcomes.' },
              { label: 'Learning Loops',       desc: 'System performance improves with each completed task cycle.' },
            ].map((item) => (
              <SurfaceCard key={item.label}>
                <p className="text-sm font-black text-white">{item.label}</p>
                <p className="mt-1 text-xs text-slate-400">{item.desc}</p>
              </SurfaceCard>
            ))}
          </div>
        </SectionInner>
      </SectionWrap>

      {/* OPERATIONS */}
      <SectionWrap>
        <SectionInner>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Operations & Runtime</p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">
            Calm, trustworthy operational control.
          </h2>
          <p className="mt-5 max-w-3xl text-lg text-slate-300">
            Live visibility into provider health, deployment status, approval queues, storage state, and workload execution. The command infrastructure stays calm, transparent, and always reviewable.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {['Provider Health', 'Deployment Status', 'Approval Queues', 'Storage Truth'].map((item) => (
              <SurfaceCard key={item}>
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                <p className="mt-3 text-sm font-black text-white">{item}</p>
              </SurfaceCard>
            ))}
          </div>
        </SectionInner>
      </SectionWrap>

      {/* AMARKTAI ASSISTANT */}
      <SectionWrap>
        <SectionInner className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <SurfaceCard>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Amarktai Assistant</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white">
              The operator interface across the entire network.
            </h2>
            <p className="mt-5 text-slate-300">
              Amarktai Assistant is workspace-aware, memory-aware, and action-aware. It routes requests, coordinates agents, surfaces operational context, and executes tasks through the command layer — calm, direct, and built for real operations.
            </p>
          </SurfaceCard>
          <SurfaceCard className="flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Restricted Access</p>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                AmarktAI Network is not an open-access platform. Access is reviewed and provisioned for verified operator teams building real systems.
              </p>
            </div>
            <Link
              href="/contact"
              className="mt-6 inline-flex w-fit rounded-xl border border-cyan-300/35 px-4 py-2.5 text-sm text-cyan-100 transition hover:bg-cyan-300/10"
            >
              Submit restricted inquiry
            </Link>
          </SurfaceCard>
        </SectionInner>
      </SectionWrap>

      {/* SYSTEM PILLARS */}
      <SectionWrap>
        <SectionInner>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Command Constellation</p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">
            One network. Nine command surfaces.
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {commandNodes.map((node) => (
              <SurfaceCard key={node.label}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">System surface</p>
                <h3 className="mt-3 text-2xl font-black text-white">{node.label}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">{node.body}</p>
              </SurfaceCard>
            ))}
          </div>
        </SectionInner>
      </SectionWrap>
    </PublicShell>
  )
}
