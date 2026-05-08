import PublicShell from '@/components/public/PublicShell'

const systems = [
  ['Repository Workbench', 'Plans, patches, checks, pull requests, approvals, and deployment movement for code repositories.'],
  ['Studio', 'Research, chat, image, video, audio, transcription, and artifact creation through routed multimodal workflows.'],
  ['Operations', 'Provider health, queues, storage, policy, approvals, release gates, and runtime status.'],
  ['Memory', 'Persistent context for artifacts, sessions, repository decisions, workflow outcomes, and model performance.'],
]

const mesh = [
  ['Application context', 'Each connected app keeps its own history, constraints, and operating role.'],
  ['Agent assignment', 'Specialist agents work inside clear responsibilities instead of a single generic assistant model.'],
  ['Shared infrastructure', 'Routing, memory, artifacts, and approval gates are common across every connected workflow.'],
  ['Operational intelligence', 'The network learns from outcomes and improves future routing, planning, and validation.'],
]

export default function AppsPage() {
  return (
    <PublicShell>
      <section className="architecture-band pb-20 pt-24 lg:pb-28 lg:pt-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--amarkt-dim)]">Apps and agents</p>
          <h1 className="mt-5 max-w-5xl text-5xl font-semibold leading-tight text-balance text-white lg:text-7xl">
            Connected applications become an orchestration network.
          </h1>
          <p className="mt-7 max-w-3xl text-base leading-8 text-[var(--amarkt-muted)] sm:text-lg">
            AmarktAI binds application context, assigned agents, workflow memory, model routes, and approval state into one operating mesh.
          </p>
        </div>
      </section>

      <section className="bg-[var(--amarkt-black)] py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-px border border-white/[0.08] bg-white/[0.08] lg:grid-cols-4">
            {systems.map(([title, body]) => (
              <article key={title} className="min-h-[250px] bg-[var(--amarkt-graphite)] p-7">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--amarkt-blue)]">system</p>
                <h2 className="mt-5 text-xl font-semibold text-white">{title}</h2>
                <p className="mt-4 text-sm leading-7 text-[var(--amarkt-muted)]">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--amarkt-obsidian)] py-24 lg:py-32">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-8">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--amarkt-dim)]">Orchestration mesh</p>
            <h2 className="mt-5 text-3xl font-semibold leading-tight text-white sm:text-4xl">
              Agent work becomes structured, visible, and reusable.
            </h2>
          </div>
          <div className="grid gap-px border border-white/[0.08] bg-white/[0.08] sm:grid-cols-2">
            {mesh.map(([title, body]) => (
              <article key={title} className="bg-[var(--amarkt-graphite)] p-6">
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="mt-4 text-sm leading-7 text-[var(--amarkt-muted)]">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
