import Link from 'next/link'
import PublicShell from '@/components/public/PublicShell'
import SuperbrainScene from '@/components/public/SuperbrainScene'
import { SectionInner, SectionWrap, SurfaceCard } from '@/components/public/PublicSection'

const docsSections = [
  { title: 'System model', body: 'How Studio, Workbench, apps, memory, operations, and settings function as one orchestrated runtime.' },
  { title: 'Operator workflow', body: 'Prompt, planning, patch review, approvals, execution, deployment, and post-run learning loops.' },
  { title: 'Capability surfaces', body: 'Chat, coding, research, media creation, artifacts, model routing, and runtime health controls.' },
  { title: 'Governance', body: 'Policies, guarded approvals, storage truth, and admin controls for high-impact actions.' },
]

export default function DocsPage() {
  return (
    <PublicShell>
      <SectionWrap className="pb-8 pt-14 lg:pt-18">
        <SectionInner className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Documentation</p>
            <h1 className="mt-4 text-5xl font-black tracking-[-0.06em] text-white sm:text-6xl">Operator docs for the AmarktAI Network runtime model.</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">A polished overview of how the system thinks, routes work, creates artifacts, and keeps operations reviewable.</p>
          </div>
          <div className="h-[320px] overflow-hidden rounded-3xl border border-white/10 bg-[#030d21]">
            <SuperbrainScene variant="ambient" />
          </div>
        </SectionInner>
      </SectionWrap>

      <SectionWrap>
        <SectionInner className="grid gap-4 md:grid-cols-2">
          {docsSections.map((section) => (
            <SurfaceCard key={section.title}>
              <h2 className="text-xl font-black text-white">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">{section.body}</p>
            </SurfaceCard>
          ))}
        </SectionInner>
      </SectionWrap>

      <SectionWrap>
        <SectionInner>
          <SurfaceCard>
            <h2 className="text-2xl font-black text-white">Start with the operator model</h2>
            <p className="mt-3 text-sm text-slate-400">This public docs overview is intentionally concise and aligned with the restricted runtime. For full access, submit an inquiry.</p>
            <Link href="/contact" className="mt-5 inline-flex rounded-xl border border-cyan-300/35 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-300/10">Contact for restricted docs access</Link>
          </SurfaceCard>
        </SectionInner>
      </SectionWrap>
    </PublicShell>
  )
}
