import PublicShell from '@/components/public/PublicShell'

const principles = [
  {
    title: 'Infrastructure before interface',
    body: 'AI capability fails without routing discipline, memory continuity, and enforceable operations governance. The infrastructure layer is not optional — it is the product.',
    accent: '96,165,250',
  },
  {
    title: 'Governed automation',
    body: 'Execution speed must be coupled with approval checkpoints, policy controls, and complete traceability. Speed without governance is operational risk.',
    accent: '139,92,246',
  },
  {
    title: 'Operational sovereignty',
    body: 'Private teams require model flexibility, provider choice, and deployment control without surrendering operational context to external systems.',
    accent: '99,102,241',
  },
]

const pillars = [
  {
    label: 'Model routing',
    detail: 'Dynamic selection across providers with fallback, latency scoring, and policy enforcement.',
  },
  {
    label: 'Agent orchestration',
    detail: 'Specialised agents assigned to applications, repositories, and infrastructure tasks.',
  },
  {
    label: 'Persistent memory',
    detail: 'Operational context that persists across sessions, jobs, and deployment cycles.',
  },
  {
    label: 'Artifact system',
    detail: 'Every generated output stored, versioned, audited, and retrievable.',
  },
  {
    label: 'Approval gates',
    detail: 'Deployment and operation checkpoints with policy-enforced clearance flows.',
  },
  {
    label: 'Multimodal Studio',
    detail: 'Chat, research, image, video, audio, and transcription under one routing layer.',
  },
  {
    label: 'Workbench pipeline',
    detail: 'Repository path from prompt to governed production release.',
  },
  {
    label: 'Runtime truth',
    detail: 'Provider health, queue state, and system telemetry visible and governed.',
  },
]

export default function AboutPage() {
  return (
    <PublicShell>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#04060f] pb-20 pt-24 lg:pb-24 lg:pt-32">
        <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(96,165,250,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(96,165,250,0.5)_1px,transparent_1px)] [background-size:56px_56px]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(99,102,241,0.3)] to-transparent" />

        <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-[11px] uppercase tracking-[0.26em] text-[#4a5f88]">About</p>
          <h1 className="mt-5 max-w-5xl text-4xl font-semibold leading-[1.1] tracking-[-0.04em] text-[#eef2fb] sm:text-5xl lg:text-[3.25rem]">
            Private AI operations infrastructure is now a core systems requirement.
          </h1>
          <p className="mt-7 max-w-3xl text-base leading-9 text-[#7a8daf]">
            AmarktAI Network exists to provide an operational layer where model routing, agent execution, memory continuity, repository workflows, and deployment control can be managed inside one governed environment — without compromise on speed, safety, or auditability.
          </p>
        </div>
      </section>

      {/* Principles */}
      <section className="bg-[#05070f] py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="mb-10 text-[11px] uppercase tracking-[0.24em] text-[#4a5f88]">Design principles</p>
          <div className="grid gap-[1px] overflow-hidden border border-[#1a2038] bg-[#1a2038] lg:grid-cols-3">
            {principles.map((item) => (
              <article key={item.title} className="relative bg-[#070a14] p-8">
                <div
                  className="absolute inset-x-0 top-0 h-px"
                  style={{ background: `linear-gradient(90deg,transparent,rgba(${item.accent},0.5),transparent)` }}
                />
                <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#e2e9f8]">{item.title}</h2>
                <p className="mt-4 text-sm leading-8 text-[#7a8daf]">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Product pillars */}
      <section className="bg-[#040610] py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="mb-10 text-[11px] uppercase tracking-[0.24em] text-[#4a5f88]">Product pillars</p>
          <div className="grid gap-[1px] overflow-hidden border border-[#1a2038] bg-[#1a2038] sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map((pillar) => (
              <article key={pillar.label} className="bg-[#070a14] px-6 py-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a0b4d8]">{pillar.label}</p>
                <p className="mt-3 text-sm leading-7 text-[#6a7da0]">{pillar.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Mission statement */}
      <section className="bg-[#05070f] py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="border-l border-[#1e2a48] pl-8">
            <p className="max-w-3xl text-xl leading-10 tracking-[-0.01em] text-[#8a9dbe] sm:text-2xl sm:leading-[2.75rem]">
              The mission is straightforward: preserve operational control under real workloads while enabling model and agent systems to execute quickly, safely, and with durable memory that compounds across every cycle.
            </p>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
