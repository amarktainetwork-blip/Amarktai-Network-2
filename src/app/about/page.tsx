import PublicShell from '@/components/public/PublicShell'
import CommandConstellationScene from '@/components/public/CommandConstellationScene'
import { SectionInner, SectionWrap, SurfaceCard } from '@/components/public/PublicSection'

const pillars = [
  {
    title: 'Mission',
    body: 'Turn fragmented AI stacks into one orchestrated command network that learns, routes, and improves with every operation — under full operator control.',
  },
  {
    title: 'Operator Model',
    body: 'Amarktai Assistant serves as the calm operator interface across Studio, Workbench, agents, and runtime. All actions remain traceable and reviewable.',
  },
  {
    title: 'Trust Model',
    body: 'Approval gates, policy controls, storage truth checks, and deployment guardrails protect every high-impact action from unreviewed execution.',
  },
]

const philosophy = [
  { label: 'Precision over hype',   body: 'We build operational systems, not demos. Every capability must work in production under real conditions.' },
  { label: 'Operator sovereignty',  body: 'The system surfaces intelligence. Operators make final decisions. Autonomy is bounded, not unchecked.' },
  { label: 'Memory-first design',   body: 'Persistent context compounds across every session, making the system sharper over time without manual re-briefing.' },
  { label: 'Traceable execution',   body: 'Every prompt, plan, patch, and deployment is logged. Nothing happens without a complete audit trail.' },
]

export default function AboutPage() {
  return (
    <PublicShell>
      {/* HERO */}
      <section className="relative overflow-hidden pb-12 pt-20 lg:pt-28">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <CommandConstellationScene variant="ambient" className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#020612]/40 via-transparent to-[#020612]/80" />
        <SectionInner className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-300">About AmarktAI Network</p>
          <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[1.04] tracking-[-0.05em] text-white sm:text-6xl">
            One operating system for AI work that must run in the real world.
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-300">
            We are building a central command network that connects apps, agents, memory, model routing, artifacts, and operational controls — so operator teams can execute faster without sacrificing governance or truth.
          </p>
        </SectionInner>
      </section>

      {/* PILLARS */}
      <SectionWrap>
        <SectionInner className="grid gap-4 md:grid-cols-3">
          {pillars.map((pillar) => (
            <SurfaceCard key={pillar.title}>
              <h2 className="text-xl font-black text-white">{pillar.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">{pillar.body}</p>
            </SurfaceCard>
          ))}
        </SectionInner>
      </SectionWrap>

      {/* PHILOSOPHY */}
      <SectionWrap>
        <SectionInner>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Operating Philosophy</p>
          <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
            Intelligence without loss of control.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {philosophy.map((item) => (
              <SurfaceCard key={item.label}>
                <p className="text-sm font-black text-white">{item.label}</p>
                <p className="mt-3 text-sm leading-7 text-slate-400">{item.body}</p>
              </SurfaceCard>
            ))}
          </div>
        </SectionInner>
      </SectionWrap>
    </PublicShell>
  )
}
