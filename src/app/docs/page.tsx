import PublicShell from '@/components/public/PublicShell'

const manual = [
  ['System map', 'Network layers, route boundaries, and execution domains.'],
  ['Route policy', 'Model selection policy, provider fallback, and governance rules.'],
  ['Agent lifecycle', 'Task intake, orchestration steps, and handoff controls.'],
  ['Memory protocol', 'Context retention, retrieval scopes, and update cadence.'],
  ['Artifact pipeline', 'Generation, storage, audit metadata, and delivery channels.'],
  ['Deployment controls', 'Approval sequencing, release gates, and runtime verification.'],
]

export default function DocsPage() {
  return (
    <PublicShell>
      <section className="mx-auto max-w-7xl px-5 pb-12 pt-16 lg:px-8 lg:pt-24">
        <p className="text-xs uppercase tracking-[0.2em] text-[#95a0bc]">Docs</p>
        <h1 className="mt-6 max-w-5xl text-4xl font-semibold leading-tight tracking-[-0.03em] text-[#edf1fb] sm:text-5xl">
          Product manual entry for the AmarktAI Network operating model.
        </h1>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="grid gap-[1px] overflow-hidden border border-[#2a3142] bg-[#2a3142] md:grid-cols-2">
          {manual.map(([title, body]) => (
            <article key={title} className="bg-[#0b0f19] p-6">
              <h2 className="text-lg font-semibold text-[#edf0fa]">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-[#bbc5dc]">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 pt-10 lg:px-8 lg:pb-24">
        <p className="max-w-4xl border-t border-[#2a3142] pt-8 text-sm leading-8 text-[#b9c2d8]">
          This public manual outlines system structure and operational intent. Internal runbooks, API references, and integration procedures remain private to operating environments.
        </p>
      </section>
    </PublicShell>
  )
}
