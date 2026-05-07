import PublicShell from '@/components/public/PublicShell'
import SuperbrainScene from '@/components/public/SuperbrainScene'
import { SectionInner, SectionWrap, SurfaceCard } from '@/components/public/PublicSection'

export default function AboutPage() {
  return (
    <PublicShell>
      <SectionWrap className="pb-8 pt-14 lg:pt-18">
        <SectionInner className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">About AmarktAI Network</p>
            <h1 className="mt-4 text-5xl font-black tracking-[-0.06em] text-white sm:text-6xl">One operating system for AI work that must run in the real world.</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
              We are building a central superbrain that connects apps, agents, memory, model routing, artifacts, and operational controls so teams can execute faster without sacrificing truth or governance.
            </p>
          </div>
          <div className="h-[320px] overflow-hidden rounded-3xl border border-white/10 bg-[#030d21]">
            <SuperbrainScene variant="ambient" />
          </div>
        </SectionInner>
      </SectionWrap>

      <SectionWrap>
        <SectionInner className="grid gap-4 md:grid-cols-3">
          <SurfaceCard>
            <h2 className="text-xl font-black text-white">Mission</h2>
            <p className="mt-3 text-sm text-slate-400">Turn fragmented AI stacks into one orchestrated network that learns and improves with every operation.</p>
          </SurfaceCard>
          <SurfaceCard>
            <h2 className="text-xl font-black text-white">Operator model</h2>
            <p className="mt-3 text-sm text-slate-400">Amarktai Assistant serves as the calm operator interface across Studio, Workbench, agents, and runtime operations.</p>
          </SurfaceCard>
          <SurfaceCard>
            <h2 className="text-xl font-black text-white">Trust model</h2>
            <p className="mt-3 text-sm text-slate-400">Approvals, policy controls, storage checks, and deployment guardrails protect high-impact actions.</p>
          </SurfaceCard>
        </SectionInner>
      </SectionWrap>
    </PublicShell>
  )
}
