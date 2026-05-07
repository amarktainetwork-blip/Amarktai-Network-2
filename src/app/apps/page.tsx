import PublicShell from '@/components/public/PublicShell'
import SuperbrainScene from '@/components/public/SuperbrainScene'
import { SectionInner, SectionWrap, SurfaceCard } from '@/components/public/PublicSection'

const apps = [
  'Connected app orchestration',
  'Agent packs per product surface',
  'Workbench automation pipelines',
  'Continuous memory-informed actions',
  'Operations feedback loops',
  'Guarded autonomy with approvals',
]

const agentTypes = ['Coding agents', 'Repo audit agents', 'Deployment agents', 'Research agents', 'Creative agents', 'Operations agents', 'Safety agents']

export default function AppsPage() {
  return (
    <PublicShell>
      <SectionWrap className="pb-8 pt-14 lg:pt-18">
        <SectionInner className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Apps & Agent Orchestration</p>
            <h1 className="mt-4 text-5xl font-black tracking-[-0.06em] text-white sm:text-6xl">Every app becomes part of the same intelligent command network.</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">Connect products, attach specialist agents, wire Workbench flows, and keep every action tied to runtime truth and approvals.</p>
          </div>
          <div className="h-[320px] overflow-hidden rounded-3xl border border-white/10 bg-[#030d21]">
            <SuperbrainScene variant="ambient" />
          </div>
        </SectionInner>
      </SectionWrap>

      <SectionWrap>
        <SectionInner className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((item) => (
            <SurfaceCard key={item}>
              <p className="text-sm font-semibold text-slate-200">{item}</p>
            </SurfaceCard>
          ))}
        </SectionInner>
      </SectionWrap>

      <SectionWrap>
        <SectionInner>
          <h2 className="text-3xl font-black tracking-[-0.04em] text-white">Specialist agent system</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {agentTypes.map((agent) => (
              <div key={agent} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">{agent}</div>
            ))}
          </div>
        </SectionInner>
      </SectionWrap>
    </PublicShell>
  )
}
