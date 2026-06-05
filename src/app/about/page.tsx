import PublicShell from '@/components/public/PublicShell'

const principles = [
  ['Infrastructure before interface', 'Reliable AI work depends on routing discipline, durable context, explicit boundaries, and operational evidence.'],
  ['Automation with restraint', 'Agents should move quickly inside defined scopes and pause when production, policy, or ownership requires review.'],
  ['Provider independence', 'A serious operating layer keeps model choice flexible while preserving memory, artifacts, and workflow state.'],
  ['Truthful systems', 'Operations, approvals, queues, provider health, and deployments must be visible as system facts, not hidden side effects.'],
]

const manifesto = [
  'The platform exists because AI work now touches codebases, media systems, customer data, production releases, and institutional decision paths.',
  'That work cannot be managed as isolated chats. It needs a private operating layer with memory, routing, approvals, and runtime visibility.',
  'AmarktAI Network is built around that premise: high-agency AI systems should be observable, governable, and useful under real operational pressure.',
]

export default function AboutPage() {
  return (
    <PublicShell>
      <section className="architecture-band pb-20 pt-24 lg:pb-28 lg:pt-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--amarkt-dim)]">Product philosophy</p>
          <h1 className="mt-5 max-w-5xl text-5xl font-semibold leading-tight text-balance text-white lg:text-7xl">
            Connected digital work needs clear control before it needs more complexity.
          </h1>
          <p className="mt-7 max-w-3xl text-base leading-8 text-[var(--amarkt-muted)] sm:text-lg">
            AmarktAI Network is an infrastructure company building the operating architecture for AI systems that route, remember, generate, review, and deploy.
          </p>
        </div>
      </section>

      <section className="bg-[var(--amarkt-black)] py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-px border border-white/[0.08] bg-white/[0.08] lg:grid-cols-4">
            {principles.map(([title, body]) => (
              <article key={title} className="min-h-[240px] bg-[var(--amarkt-graphite)] p-7">
                <div className="section-line h-px w-14" />
                <h2 className="mt-7 text-xl font-semibold text-white">{title}</h2>
                <p className="mt-4 text-sm leading-7 text-[var(--amarkt-muted)]">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--amarkt-obsidian)] py-24 lg:py-32">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-8">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--amarkt-dim)]">Operational manifesto</p>
            <h2 className="mt-5 text-3xl font-semibold leading-tight text-white sm:text-4xl">The product is the system of control.</h2>
          </div>
          <div className="space-y-8">
            {manifesto.map((line) => (
              <p key={line} className="border-l border-white/[0.12] pl-6 text-lg leading-9 text-[var(--amarkt-soft)]">
                {line}
              </p>
            ))}
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
