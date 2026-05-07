import PublicShell from '@/components/public/PublicShell'
import CommandConstellationScene from '@/components/public/CommandConstellationScene'
import { SectionInner, SectionWrap, SurfaceCard } from '@/components/public/PublicSection'

const meshCapabilities = [
  { label: 'App-specific agent orchestration', desc: 'Specialist agents attach to each product surface and operate within its context.' },
  { label: 'Workflow automation pipelines',    desc: 'Instruction flows convert into multi-step automated sequences with approval checkpoints.' },
  { label: 'Memory-informed decisions',        desc: 'Persistent memory across apps ensures each action builds on prior operational knowledge.' },
  { label: 'Deployment confidence controls',   desc: 'Checks, previews, and staged rollouts reduce risk at every deployment boundary.' },
  { label: 'Cross-app signal propagation',     desc: 'Events in one app surface inform agents and routing decisions across the entire network.' },
  { label: 'Guarded autonomy',                 desc: 'Approval gates prevent high-impact actions from executing without operator review.' },
]

const agentTypes = [
  'Coding agents',
  'Repo audit agents',
  'Deployment agents',
  'Research agents',
  'Operations agents',
  'Safety agents',
  'Creative agents',
  'Media workflow agents',
]

export default function AppsPage() {
  return (
    <PublicShell>
      {/* HERO */}
      <section className="relative overflow-hidden pb-12 pt-20 lg:pt-28">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <CommandConstellationScene variant="ambient" className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#020612]/40 via-transparent to-[#020612]/80" />
        <SectionInner className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-300">Apps & Agent Orchestration</p>
          <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[1.04] tracking-[-0.05em] text-white sm:text-6xl">
            Every app becomes part of the same intelligent command network.
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-300">
            Connect products, attach specialist agents, wire Workbench automation flows, and keep every action tied to runtime truth, persistent memory, and governed approvals.
          </p>
        </SectionInner>
      </section>

      {/* APP MESH */}
      <SectionWrap>
        <SectionInner>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">App Mesh</p>
          <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
            Applications orchestrated as one connected mesh.
          </h2>
          <p className="mt-5 max-w-3xl text-lg text-slate-300">
            Each application connects into the command network. Agents, memory, and deployment flows are shared across the mesh — reducing redundancy and compounding operational intelligence over time.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {meshCapabilities.map((item) => (
              <SurfaceCard key={item.label}>
                <p className="text-sm font-black text-white">{item.label}</p>
                <p className="mt-3 text-xs leading-6 text-slate-400">{item.desc}</p>
              </SurfaceCard>
            ))}
          </div>
        </SectionInner>
      </SectionWrap>

      {/* AGENT TYPES */}
      <SectionWrap>
        <SectionInner>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Specialist Agent System</p>
          <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
            Purpose-built agents for every operation type.
          </h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {agentTypes.map((agent) => (
              <div key={agent} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                <span className="text-sm font-medium text-slate-200">{agent}</span>
              </div>
            ))}
          </div>
        </SectionInner>
      </SectionWrap>
    </PublicShell>
  )
}
