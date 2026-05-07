import PublicShell from '@/components/public/PublicShell'

const principles = [
  {
    title: 'Infrastructure before interface',
    body: 'AI capability fails without routing discipline, memory continuity, and enforceable operations governance.',
  },
  {
    title: 'Governed automation',
    body: 'Execution speed must be coupled with approval checkpoints, policy controls, and complete traceability.',
  },
  {
    title: 'Operational sovereignty',
    body: 'Private teams need model flexibility and deployment control without surrendering operational context.',
  },
]

export default function AboutPage() {
  return (
    <PublicShell>
      <section className="mx-auto max-w-7xl px-5 pb-12 pt-16 lg:px-8 lg:pt-24">
        <p className="text-xs uppercase tracking-[0.2em] text-[#95a0bc]">About</p>
        <h1 className="mt-6 max-w-5xl text-4xl font-semibold leading-tight tracking-[-0.03em] text-[#edf1fb] sm:text-5xl">
          Private AI operations infrastructure is now a core systems requirement.
        </h1>
        <p className="mt-6 max-w-4xl text-base leading-8 text-[#b9c2d8]">
          AmarktAI Network exists to provide an operational layer where model routing, agent execution, memory continuity, repository workflows, and deployment control can be managed inside one governed environment.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="grid gap-[1px] overflow-hidden border border-[#2a3142] bg-[#2a3142] lg:grid-cols-3">
          {principles.map((item) => (
            <article key={item.title} className="bg-[#0b0f19] p-6">
              <h2 className="text-lg font-semibold text-[#edf0fa]">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[#bbc5dc]">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 pt-10 lg:px-8 lg:pb-24">
        <p className="max-w-4xl border-t border-[#2a3142] pt-8 text-sm leading-8 text-[#b9c2d8]">
          The mission is straightforward: preserve control under real workloads while enabling model and agent systems to execute quickly, safely, and with durable memory.
        </p>
      </section>
    </PublicShell>
  )
}
