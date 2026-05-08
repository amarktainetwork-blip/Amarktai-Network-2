import PublicShell from '@/components/public/PublicShell'

const blueprint = [
  ['01', 'Intake', 'Inputs arrive as prompts, files, repository scopes, media requests, or operational tasks.'],
  ['02', 'Routing', 'The system evaluates provider health, capability, latency, policy, cost, and fallback options.'],
  ['03', 'Orchestration', 'Agents receive scoped work and coordinate through a central execution layer.'],
  ['04', 'Memory', 'Relevant context is retrieved before work begins and updated after outcomes are known.'],
  ['05', 'Artifacts', 'Generated text, code, images, video, audio, plans, and reports are stored with provenance.'],
  ['06', 'Approvals', 'Sensitive actions move through review gates before production state changes.'],
  ['07', 'Operations', 'Runtime state exposes queues, provider health, storage, deployments, and policy conditions.'],
]

export default function DocsPage() {
  return (
    <PublicShell>
      <section className="architecture-band pb-20 pt-24 lg:pb-28 lg:pt-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--amarkt-dim)]">System blueprint</p>
          <h1 className="mt-5 max-w-5xl text-5xl font-semibold leading-tight text-balance text-white lg:text-7xl">
            A public operating manual for the AmarktAI architecture.
          </h1>
          <p className="mt-7 max-w-3xl text-base leading-8 text-[var(--amarkt-muted)] sm:text-lg">
            This overview explains the system model: how work enters, routes, executes, persists, waits for approval, and reaches deployment.
          </p>
        </div>
      </section>

      <section className="bg-[var(--amarkt-black)] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="overflow-hidden border border-white/[0.08]">
            {blueprint.map(([step, title, body]) => (
              <article key={step} className="grid gap-6 border-b border-white/[0.08] bg-[var(--amarkt-graphite)] p-7 last:border-0 lg:grid-cols-[140px_260px_1fr]">
                <p className="font-mono text-sm text-[var(--amarkt-dim)]">{step}</p>
                <h2 className="text-xl font-semibold text-white">{title}</h2>
                <p className="text-sm leading-7 text-[var(--amarkt-muted)]">{body}</p>
              </article>
            ))}
          </div>
          <p className="mt-8 max-w-3xl text-sm leading-7 text-[var(--amarkt-dim)]">
            Internal API references, credentials, provider setup, and deployment runbooks remain private to operating environments.
          </p>
        </div>
      </section>
    </PublicShell>
  )
}
