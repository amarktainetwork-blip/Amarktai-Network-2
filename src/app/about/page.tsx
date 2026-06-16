import PublicShell from '@/components/public/PublicShell'

const principles = [
  ['One Brain for many apps', 'AmarktAI Network is built around one operating layer that serves many products through capabilities, not isolated provider integrations.'],
  ['Capability-first execution', 'People and apps should ask for outcomes. The Brain resolves providers, models, and endpoints behind the scenes.'],
  ['Truthful operation', 'Approvals, jobs, artifacts, blockers, and runtime readiness must remain visible as facts instead of hidden implementation detail.'],
  ['Control before complexity', 'We prioritize routing discipline, reusable artifacts, scoped app access, and runtime evidence before adding more autonomous behavior.'],
]

const story = [
  'AI work now spans research, media creation, customer workflows, app integration, and production operations.',
  'That work cannot be managed safely as isolated chat sessions or disconnected vendor tools.',
  'AmarktAI Network exists to provide one Brain that routes capability requests, tracks operational truth, and keeps completed outputs reusable across apps and teams.',
]

export default function AboutPage() {
  return (
    <PublicShell>
      <section className="architecture-band pb-20 pt-24 lg:pb-28 lg:pt-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--amarkt-dim)]">About AmarktAI</p>
          <h1 className="mt-5 max-w-5xl text-5xl font-black leading-tight text-balance text-white lg:text-7xl">
            AmarktAI Network is designed to make AI work operational, not chaotic.
          </h1>
          <p className="mt-7 max-w-3xl text-base leading-8 text-[var(--amarkt-muted)] sm:text-lg">
            The product direction is straightforward: one Brain, many apps, capability-first execution, and a control plane that reflects runtime truth.
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
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--amarkt-dim)]">Why it exists</p>
            <h2 className="mt-5 text-3xl font-semibold leading-tight text-white sm:text-4xl">The product is the operating layer between requests and real work.</h2>
          </div>
          <div className="space-y-8">
            {story.map((line) => (
              <p key={line} className="border-l border-white/[0.12] pl-6 text-lg leading-9 text-[var(--amarkt-soft)]">
                {line}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20 text-slate-950 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-3 lg:px-8">
          {[
            ['Mission', 'Make AI execution useful for real products by grounding it in capabilities, routing, jobs, and artifacts.'],
            ['Philosophy', 'Keep the app-facing surface simple while the Brain handles infrastructure complexity behind the scenes.'],
            ['V1 direction', 'Focus on capability routing, research/media orchestration, control-plane visibility, and truthful runtime state before broader redesign claims.'],
          ].map(([title, body]) => (
            <article key={title} className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-7 shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
              <h3 className="text-xl font-black text-slate-950">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
            </article>
          ))}
        </div>
      </section>
    </PublicShell>
  )
}
