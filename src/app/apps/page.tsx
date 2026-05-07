import PublicShell from '@/components/public/PublicShell'

const network = [
  { app: 'Repository Workbench', agents: 'Planner, Patch, QA, Release', role: 'Code path governance' },
  { app: 'Studio', agents: 'Research, Media, Transcript, Artifact', role: 'Multimodal execution' },
  { app: 'Operations', agents: 'Runtime, Queue, Policy, Audit', role: 'Infrastructure control' },
  { app: 'Memory', agents: 'Context index, Retrieval, Session link', role: 'Historical continuity' },
]

export default function AppsPage() {
  return (
    <PublicShell>
      <section className="mx-auto max-w-7xl px-5 pb-12 pt-16 lg:px-8 lg:pt-24">
        <p className="text-xs uppercase tracking-[0.2em] text-[#95a0bc]">Apps</p>
        <h1 className="mt-6 max-w-5xl text-4xl font-semibold leading-tight tracking-[-0.03em] text-[#edf1fb] sm:text-5xl">
          Connected applications and assigned agents form one operating network.
        </h1>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="overflow-hidden border border-[#2a3142] bg-[#0b0f19]">
          <div className="grid border-b border-[#2a3142] bg-[#0c1120] p-4 text-xs uppercase tracking-[0.14em] text-[#9da8c4] md:grid-cols-[1.1fr_1.3fr_1fr]">
            <span>Application</span>
            <span>Assigned agents</span>
            <span>Operational role</span>
          </div>
          {network.map((row) => (
            <div key={row.app} className="grid gap-2 border-b border-[#1f2432] p-4 last:border-b-0 md:grid-cols-[1.1fr_1.3fr_1fr]">
              <p className="text-sm font-medium text-[#edf0fa]">{row.app}</p>
              <p className="text-sm text-[#cad2e6]">{row.agents}</p>
              <p className="text-sm text-[#b4bed5]">{row.role}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 pt-10 lg:px-8 lg:pb-24">
        <p className="max-w-4xl border-t border-[#2a3142] pt-8 text-sm leading-8 text-[#b9c2d8]">
          Agent assignments remain bound to application context while sharing route policies, memory systems, artifact storage, and deployment controls.
        </p>
      </section>
    </PublicShell>
  )
}
