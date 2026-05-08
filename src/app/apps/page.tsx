import PublicShell from '@/components/public/PublicShell'

const ecosystem = [
  {
    app: 'Repository Workbench',
    tag: 'Code operations',
    agents: ['Planner', 'Patch writer', 'QA validator', 'Release coordinator'],
    role: 'End-to-end repository pipeline from natural-language prompt to governed production release.',
    accent: '96,165,250',
  },
  {
    app: 'Studio',
    tag: 'Multimodal execution',
    agents: ['Research agent', 'Image synthesiser', 'Video producer', 'Transcription agent', 'Artifact manager'],
    role: 'Unified media and knowledge-work surface with routing, memory, and artifact storage.',
    accent: '139,92,246',
  },
  {
    app: 'Operations',
    tag: 'Infrastructure governance',
    agents: ['Runtime monitor', 'Queue governor', 'Policy enforcer', 'Audit recorder'],
    role: 'Live infrastructure visibility and governance for providers, queues, storage, and approvals.',
    accent: '167,139,250',
  },
  {
    app: 'Memory',
    tag: 'Persistent context',
    agents: ['Context indexer', 'Retrieval engine', 'Session linker', 'Learning recorder'],
    role: 'Operational memory layer that indexes artifacts, jobs, repositories, and session threads.',
    accent: '99,102,241',
  },
]

const connectionPoints = [
  'Shared model routing layer',
  'Shared memory and context index',
  'Shared artifact storage and versioning',
  'Shared approval and policy gateway',
  'Shared provider health telemetry',
  'Shared deployment guard conditions',
]

export default function AppsPage() {
  return (
    <PublicShell>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#04060f] pb-20 pt-24 lg:pb-24 lg:pt-32">
        <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(96,165,250,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(96,165,250,0.5)_1px,transparent_1px)] [background-size:56px_56px]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(99,102,241,0.3)] to-transparent" />

        <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-[11px] uppercase tracking-[0.26em] text-[#4a5f88]">Apps & agents</p>
          <h1 className="mt-5 max-w-5xl text-4xl font-semibold leading-[1.1] tracking-[-0.04em] text-[#eef2fb] sm:text-5xl">
            Connected applications and their assigned agents form one operating network.
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-9 text-[#7a8daf]">
            Each application operates within a shared infrastructure layer — routing, memory, artifacts, and governance are available to every agent across the network.
          </p>
        </div>
      </section>

      {/* App / Agent grid */}
      <section className="bg-[#05070f] py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-[1px] overflow-hidden border border-[#1a2038] bg-[#1a2038] lg:grid-cols-2">
            {ecosystem.map((item) => (
              <article key={item.app} className="relative bg-[#070a14] p-8">
                <div
                  className="absolute inset-x-0 top-0 h-px"
                  style={{ background: `linear-gradient(90deg,transparent,rgba(${item.accent},0.45),transparent)` }}
                />
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p
                      className="text-[10px] font-medium uppercase tracking-[0.22em]"
                      style={{ color: `rgba(${item.accent},0.7)` }}
                    >
                      {item.tag}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[#e2e9f8]">{item.app}</h2>
                  </div>
                </div>
                <p className="mb-5 text-sm leading-7 text-[#7a8daf]">{item.role}</p>
                <div className="border-t border-[#1a2038] pt-5">
                  <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[#45577a]">Assigned agents</p>
                  <div className="flex flex-wrap gap-2">
                    {item.agents.map((agent) => (
                      <span
                        key={agent}
                        className="rounded-sm border px-2.5 py-1 text-[11px] tracking-[0.08em]"
                        style={{
                          borderColor: `rgba(${item.accent},0.22)`,
                          background: `rgba(${item.accent},0.06)`,
                          color: `rgba(${item.accent},0.8)`,
                        }}
                      >
                        {agent}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Shared infrastructure */}
      <section className="bg-[#040610] py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#4a5f88]">Shared infrastructure</p>
              <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[#e2e9f8]">
                Agent assignments remain bound to application context while sharing one infrastructure foundation.
              </h2>
              <p className="mt-5 text-sm leading-8 text-[#6a7da0]">
                Routing policies, memory systems, artifact storage, and deployment controls are not duplicated per application — they are shared across the entire network.
              </p>
            </div>
            <div className="grid gap-[1px] overflow-hidden border border-[#1a2038] bg-[#1a2038] sm:grid-cols-2">
              {connectionPoints.map((point) => (
                <div key={point} className="flex items-center gap-3 bg-[#070a14] px-5 py-4">
                  <div className="h-1 w-1 shrink-0 rounded-full bg-[rgba(96,165,250,0.5)]" />
                  <p className="text-xs leading-6 text-[#8a9dbe]">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
