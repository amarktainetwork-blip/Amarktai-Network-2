import Link from 'next/link'
import PublicShell from '@/components/public/PublicShell'
import CommandConstellationScene from '@/components/public/CommandConstellationScene'
import { SectionInner, SectionWrap, SurfaceCard } from '@/components/public/PublicSection'

const architecture = [
  {
    title: 'System Model',
    body: 'Studio, Workbench, apps, memory, operations, and settings function as one orchestrated runtime — each surface connected through the Command Layer.',
  },
  {
    title: 'Operator Workflow',
    body: 'Prompt → planning → patch review → approval gates → execution → deployment → post-run memory update. Every cycle is traceable end to end.',
  },
  {
    title: 'Capability Surfaces',
    body: 'Chat, coding, research, media creation, artifact generation, model routing, and runtime health controls — all accessible through Amarktai Assistant.',
  },
  {
    title: 'Governance Layer',
    body: 'Policies, guarded approvals, storage truth verification, and admin controls that ensure high-impact actions remain under human oversight.',
  },
]

const systemFlows = [
  { step: '01', label: 'Instruction received',   desc: 'Operator or system trigger initiates a task through the Command Layer.' },
  { step: '02', label: 'Context retrieved',       desc: 'Memory system surfaces relevant operational history and app context.' },
  { step: '03', label: 'Model routed',            desc: 'Routing engine selects the optimal provider and model for the task type.' },
  { step: '04', label: 'Execution coordinated',   desc: 'Agents execute sub-tasks in parallel or sequence with full audit logging.' },
  { step: '05', label: 'Approval gate',           desc: 'High-impact actions pause for operator review before proceeding.' },
  { step: '06', label: 'Artifact delivered',      desc: 'Output stored, indexed, and made available across connected surfaces.' },
]

export default function DocsPage() {
  return (
    <PublicShell>
      {/* HERO */}
      <section className="relative overflow-hidden pb-12 pt-20 lg:pt-28">
        <div className="pointer-events-none absolute inset-0 opacity-35">
          <CommandConstellationScene variant="ambient" className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#020612]/50 via-transparent to-[#020612]/80" />
        <SectionInner className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-300">Documentation</p>
          <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[1.04] tracking-[-0.05em] text-white sm:text-6xl">
            Operator docs for the AmarktAI Network runtime model.
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-300">
            A structured overview of how the system routes intelligence, coordinates agents, creates artifacts, and keeps operations reviewable and trustworthy.
          </p>
        </SectionInner>
      </section>

      {/* ARCHITECTURE */}
      <SectionWrap>
        <SectionInner>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">System Architecture</p>
          <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
            Understanding the command network.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {architecture.map((section) => (
              <SurfaceCard key={section.title}>
                <h2 className="text-xl font-black text-white">{section.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-400">{section.body}</p>
              </SurfaceCard>
            ))}
          </div>
        </SectionInner>
      </SectionWrap>

      {/* EXECUTION FLOW */}
      <SectionWrap>
        <SectionInner>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Execution Flow</p>
          <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
            How a task moves through the system.
          </h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {systemFlows.map((flow) => (
              <SurfaceCard key={flow.step}>
                <p className="font-mono text-xs font-bold text-cyan-400">{flow.step}</p>
                <p className="mt-2 text-sm font-black text-white">{flow.label}</p>
                <p className="mt-2 text-xs leading-6 text-slate-400">{flow.desc}</p>
              </SurfaceCard>
            ))}
          </div>
        </SectionInner>
      </SectionWrap>

      {/* RESTRICTED ACCESS */}
      <SectionWrap>
        <SectionInner>
          <SurfaceCard>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Full documentation access</p>
            <h2 className="mt-4 text-2xl font-black text-white">Operator-level documentation is restricted.</h2>
            <p className="mt-3 text-sm text-slate-400">
              This public overview is intentionally concise. Full API references, agent configuration guides, and runtime architecture documentation are available to verified operators.
            </p>
            <Link
              href="/contact"
              className="mt-5 inline-flex rounded-xl border border-cyan-300/35 px-4 py-2.5 text-sm text-cyan-100 transition hover:bg-cyan-300/10"
            >
              Submit inquiry for restricted docs access
            </Link>
          </SurfaceCard>
        </SectionInner>
      </SectionWrap>
    </PublicShell>
  )
}
