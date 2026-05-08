import PublicShell from '@/components/public/PublicShell'
import IntelligenceFabric from '@/components/public/IntelligenceFabric'

const operatingLayers = [
  'Model routing',
  'Agent orchestration',
  'Memory',
  'Workbench',
  'Studio',
  'Runtime operations',
  'Guarded deployment',
]

const workbench = [
  { step: 'Prompt', detail: 'Operator intent and repository scope.' },
  { step: 'Plan', detail: 'Change map and implementation path.' },
  { step: 'Patch', detail: 'Code edits with explicit boundaries.' },
  { step: 'Checks', detail: 'Validation, policy checks, and security scan.' },
  { step: 'PR', detail: 'Traceable review record and approval state.' },
  { step: 'Deploy', detail: 'Controlled release into runtime operations.' },
]

const studio = ['Chat', 'Research', 'Image', 'Video', 'Audio', 'Transcription', 'Artifacts']

const operations = [
  { label: 'Provider health', value: 'Live route quality and failover state' },
  { label: 'Queues', value: 'Execution pressure across active workloads' },
  { label: 'Storage', value: 'Artifact and memory durability status' },
  { label: 'Approvals', value: 'Pending, accepted, and blocked operations' },
]

export default function HomePage() {
  return (
    <PublicShell>
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-16 lg:px-8 lg:pt-24">
        <p className="text-xs uppercase tracking-[0.2em] text-[#95a0bc]">Private intelligence infrastructure</p>
        <h1 className="mt-6 max-w-5xl text-4xl font-semibold leading-tight tracking-[-0.03em] text-[#edf1fb] sm:text-5xl lg:text-6xl">
          AmarktAI Network is a private AI operations layer for coordinating models, agents, memory, repositories, media workflows, and deployment controls.
        </h1>
      </section>

      <section className="relative min-h-[70vh] overflow-hidden border-y border-[#262b3b]">
        <div className="absolute inset-0">
          <IntelligenceFabric className="h-full w-full" />
        </div>
        <div className="relative z-10 mx-auto grid max-w-7xl gap-8 px-5 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-16">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#9aa4c0]">Intelligence Fabric</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-[#edf0fa] sm:text-4xl">Operational flow as an architectural command map.</h2>
          </div>
          <ol className="space-y-2 border border-[#2a3142] bg-[#0a0d15]/80 p-5 text-sm text-[#c4ccde]">
            <li>Input</li>
            <li>Routing</li>
            <li>Agent</li>
            <li>Memory</li>
            <li>Artifact</li>
            <li>Approval</li>
            <li>Deployment</li>
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <p className="text-xs uppercase tracking-[0.18em] text-[#9aa4c0]">Operating layers</p>
        <div className="mt-6 grid gap-[1px] overflow-hidden border border-[#2a3142] bg-[#2a3142] md:grid-cols-2 lg:grid-cols-4">
          {operatingLayers.map((layer) => (
            <div key={layer} className="bg-[#0b0f19] p-5 text-sm uppercase tracking-[0.13em] text-[#d2d9eb]">
              {layer}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <p className="text-xs uppercase tracking-[0.18em] text-[#9aa4c0]">Workbench</p>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-[#edf0fa]">Repository path from prompt to production deployment.</h2>
        <div className="mt-8 grid gap-[1px] overflow-hidden border border-[#2a3142] bg-[#2a3142] lg:grid-cols-6">
          {workbench.map((item) => (
            <article key={item.step} className="bg-[#0b0f19] p-5">
              <p className="text-xs uppercase tracking-[0.14em] text-[#9da8c4]">{item.step}</p>
              <p className="mt-2 text-sm text-[#ced5e7]">{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <p className="text-xs uppercase tracking-[0.18em] text-[#9aa4c0]">Studio</p>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-[#edf0fa]">Multimodal execution for operational teams.</h2>
        <div className="mt-8 flex flex-wrap gap-2">
          {studio.map((mode) => (
            <span key={mode} className="border border-[#30384d] bg-[#0b0f19] px-4 py-2 text-xs uppercase tracking-[0.14em] text-[#cad2e6]">
              {mode}
            </span>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <p className="text-xs uppercase tracking-[0.18em] text-[#9aa4c0]">Memory</p>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-[#edf0fa]">Operational context that compounds over time.</h2>
        <p className="mt-5 max-w-3xl text-base leading-8 text-[#b9c2d8]">
          Historical outcomes, repository decisions, and deployment history remain addressable across sessions so routing, agent behavior, and approval context improve with every cycle.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <p className="text-xs uppercase tracking-[0.18em] text-[#9aa4c0]">Operations</p>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-[#edf0fa]">Runtime truth for infrastructure governance.</h2>
        <div className="mt-8 grid gap-[1px] overflow-hidden border border-[#2a3142] bg-[#2a3142] md:grid-cols-2">
          {operations.map((item) => (
            <article key={item.label} className="bg-[#0b0f19] p-5">
              <p className="text-xs uppercase tracking-[0.14em] text-[#9da8c4]">{item.label}</p>
              <p className="mt-2 text-sm text-[#ced5e7]">{item.value}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <p className="text-xs uppercase tracking-[0.18em] text-[#9aa4c0]">Amarktai Assistant</p>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-[#edf0fa]">Operator interface for command execution and oversight.</h2>
        <p className="mt-5 max-w-3xl text-base leading-8 text-[#b9c2d8]">
          Amarktai Assistant is the control interface for instructions, routing decisions, memory retrieval, workflow transitions, and governed execution states.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 pt-10 lg:px-8 lg:pb-24">
        <p className="max-w-3xl border-t border-[#2a3142] pt-8 text-base leading-8 text-[#b9c2d8]">
          Private AI operations require controlled routing, persistent context, and reviewable deployment governance.
        </p>
      </section>
    </PublicShell>
  )
}
