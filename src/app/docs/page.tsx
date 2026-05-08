import PublicShell from '@/components/public/PublicShell'

const blueprint = [
  {
    section: 'System map',
    summary: 'Network layers, route boundaries, and execution domains.',
    detail: 'The AmarktAI Network operates across six primary layers: model routing, agent execution, memory coordination, artifact management, approval governance, and deployment control. Each layer has defined responsibilities and interface contracts.',
    accent: '96,165,250',
  },
  {
    section: 'Route policy',
    summary: 'Model selection, provider fallback, and governance rules.',
    detail: 'Routing decisions are governed by latency scores, provider health state, capability requirements, content policies, and operator-configured priorities. Fallback chains ensure continuity under provider failure.',
    accent: '139,92,246',
  },
  {
    section: 'Agent lifecycle',
    summary: 'Task intake, orchestration steps, and handoff controls.',
    detail: 'Agents receive scoped task definitions, execute within defined boundaries, pass results through validation gates, and hand off to downstream agents or approval flows. Every step is logged for audit retrieval.',
    accent: '167,139,250',
  },
  {
    section: 'Memory protocol',
    summary: 'Context retention, retrieval scopes, and update cadence.',
    detail: 'Memory entries are created from artifacts, job outcomes, repository decisions, and session threads. Retrieval is scoped by relevance, recency, and operator-configured retention policies.',
    accent: '99,102,241',
  },
  {
    section: 'Artifact pipeline',
    summary: 'Generation, storage, audit metadata, and delivery channels.',
    detail: 'Every generated output — text, code, image, video, audio — is stored with provenance metadata, linked to the originating job, and indexed in memory. Artifacts are retrievable across sessions and agent contexts.',
    accent: '79,70,229',
  },
  {
    section: 'Deployment controls',
    summary: 'Approval sequencing, release gates, and runtime verification.',
    detail: 'Deployment operations require policy clearance, approval gate passage, and optional multi-step verification. Release state is visible in Operations telemetry and all actions are recorded with timestamps and actor identifiers.',
    accent: '109,40,217',
  },
]

const caveats = [
  'Internal runbooks and API references remain private to operating environments.',
  'Provider integration procedures are documented in private operator guides.',
  'System configuration and key management details are not publicly disclosed.',
]

export default function DocsPage() {
  return (
    <PublicShell>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#04060f] pb-20 pt-24 lg:pb-24 lg:pt-32">
        <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(96,165,250,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(96,165,250,0.5)_1px,transparent_1px)] [background-size:56px_56px]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(99,102,241,0.3)] to-transparent" />

        <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-[11px] uppercase tracking-[0.26em] text-[#4a5f88]">System blueprint</p>
          <h1 className="mt-5 max-w-5xl text-4xl font-semibold leading-[1.1] tracking-[-0.04em] text-[#eef2fb] sm:text-5xl">
            Operational architecture and system design for the AmarktAI Network operating model.
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-9 text-[#7a8daf]">
            This public blueprint outlines system structure, operational intent, and product layer responsibilities. It is designed for infrastructure orientation, not implementation reference.
          </p>
        </div>
      </section>

      {/* Blueprint sections */}
      <section className="bg-[#05070f] py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="space-y-[1px] overflow-hidden border border-[#1a2038] bg-[#1a2038]">
            {blueprint.map((item) => (
              <article key={item.section} className="relative bg-[#070a14]">
                <div className="grid gap-5 p-7 lg:grid-cols-[220px_1fr]">
                  <div>
                    <div
                      className="mb-1 h-px w-8"
                      style={{ background: `rgba(${item.accent},0.5)` }}
                    />
                    <h2 className="text-base font-semibold tracking-[-0.01em] text-[#e2e9f8]">{item.section}</h2>
                    <p
                      className="mt-1.5 text-xs leading-5"
                      style={{ color: `rgba(${item.accent},0.65)` }}
                    >
                      {item.summary}
                    </p>
                  </div>
                  <p className="text-sm leading-8 text-[#7a8daf]">{item.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Scope note */}
      <section className="bg-[#040610] py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="border border-[#1a2038] p-7">
            <p className="mb-5 text-[10px] uppercase tracking-[0.22em] text-[#3d5070]">Scope of public documentation</p>
            <div className="space-y-3">
              {caveats.map((c) => (
                <div key={c} className="flex items-start gap-3">
                  <div className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-[rgba(96,165,250,0.35)]" />
                  <p className="text-sm leading-7 text-[#5d6f8a]">{c}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
