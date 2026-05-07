import Link from 'next/link'
import PublicShell from '@/components/public/PublicShell'
import SuperbrainScene from '@/components/public/SuperbrainScene'
import { SectionInner, SectionWrap, SurfaceCard } from '@/components/public/PublicSection'

const pillars = [
  { title: 'Studio', body: 'Multimodal execution for chat, research, image, video, audio, and artifacts with provider-aware outputs.' },
  { title: 'Workbench', body: 'Prompt to plan, plan to diff, diff to checks, checks to PR, and PR to deployment with runtime traceability.' },
  { title: 'Apps & Agents', body: 'Purpose-built coding, audit, deployment, research, creative, operations, and safety agents.' },
  { title: 'Memory & Learning', body: 'Persistent memory loops that compound context and improve future decisions by app and workspace.' },
  { title: 'Operations', body: 'Runtime truth for queues, approvals, storage, provider health, and workload execution.' },
  { title: 'Settings', body: 'Guardrails, model routing policies, and control surfaces that keep autonomy safe and reviewable.' },
]

const workbenchFlow = ['Prompt', 'Plan', 'Diff', 'Checks', 'PR', 'Deploy']

export default function HomePage() {
  return (
    <PublicShell>
      <SectionWrap className="pb-20 pt-14 lg:pt-20">
        <SectionInner className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">A living intelligence network</p>
            <h1 className="mt-4 text-5xl font-black tracking-[-0.06em] text-white sm:text-6xl lg:text-7xl">
              The self-learning superbrain for building and operating digital systems.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              AmarktAI Network ingests app signals, routes models, activates agents, creates artifacts, and returns decisive actions through one controlled command layer.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/apps" className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-100">Explore system pillars</Link>
              <Link href="/contact" className="rounded-2xl border border-white/15 bg-white/[0.02] px-5 py-3 text-sm font-semibold text-white hover:bg-white/[0.06]">Request restricted briefing</Link>
            </div>
            <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-500">Hint: type “login” to open restricted operator access.</p>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-[#020a1d] p-3 shadow-2xl shadow-cyan-950/20">
            <div className="h-[480px] overflow-hidden rounded-[1.5rem] sm:h-[560px]">
              <SuperbrainScene variant="hero" />
            </div>
          </div>
        </SectionInner>
      </SectionWrap>

      <SectionWrap className="pt-4">
        <SectionInner>
          <h2 className="text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">Living Superbrain</h2>
          <p className="mt-4 max-w-4xl text-slate-300">
            The system continuously learns across app workflows, remembers production context, routes the right model for each task, coordinates agent execution, watches operations, builds artifacts, and improves each cycle.
          </p>
        </SectionInner>
      </SectionWrap>

      <SectionWrap>
        <SectionInner className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pillars.map((pillar) => (
            <SurfaceCard key={pillar.title}>
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">System pillar</p>
              <h3 className="mt-3 text-2xl font-black text-white">{pillar.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-400">{pillar.body}</p>
            </SurfaceCard>
          ))}
        </SectionInner>
      </SectionWrap>

      <SectionWrap>
        <SectionInner className="grid gap-6 lg:grid-cols-2">
          <SurfaceCard>
            <h3 className="text-3xl font-black tracking-[-0.04em] text-white">Studio</h3>
            <p className="mt-4 text-slate-300">Chat, research, image, video, audio, and artifact workflows run in one workspace. Responses stay grounded in provider-dependent runtime truth.</p>
          </SurfaceCard>
          <SurfaceCard>
            <h3 className="text-3xl font-black tracking-[-0.04em] text-white">Workbench</h3>
            <p className="mt-4 text-slate-300">From instruction to shipped change: prompt → plan → diff → checks → PR → deploy.</p>
            <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {workbenchFlow.map((step) => (
                <div key={step} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">{step}</div>
              ))}
            </div>
          </SurfaceCard>
        </SectionInner>
      </SectionWrap>

      <SectionWrap>
        <SectionInner className="grid gap-6 lg:grid-cols-3">
          <SurfaceCard>
            <h3 className="text-xl font-black text-white">Apps & Agents</h3>
            <p className="mt-3 text-sm text-slate-400">Coding, repo audit, deployment, research, creative, operations, and safety agents orchestrated per app.</p>
          </SurfaceCard>
          <SurfaceCard>
            <h3 className="text-xl font-black text-white">Memory & Learning</h3>
            <p className="mt-3 text-sm text-slate-400">Persistent memory streams and learning pulses produce sharper decisions over time.</p>
          </SurfaceCard>
          <SurfaceCard>
            <h3 className="text-xl font-black text-white">Operations & Trust</h3>
            <p className="mt-3 text-sm text-slate-400">Runtime truth, approvals, model/provider status, queues, storage, and deployment guardrails.</p>
          </SurfaceCard>
        </SectionInner>
      </SectionWrap>

      <SectionWrap>
        <SectionInner className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <SurfaceCard>
            <h3 className="text-3xl font-black tracking-[-0.04em] text-white">Amarktai Assistant</h3>
            <p className="mt-4 text-slate-300">
              The conversational operator interface for the entire network — workspace-aware, memory-aware, and action-aware. Calm, direct, and built for execution under control.
            </p>
          </SurfaceCard>
          <SurfaceCard className="flex flex-col justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Restricted access</p>
              <p className="mt-3 text-sm leading-7 text-slate-400">This platform is not open signup. Access is reviewed and provisioned for real operator teams.</p>
            </div>
            <Link href="/contact" className="mt-6 inline-flex w-fit rounded-xl border border-cyan-300/35 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-300/10">Submit inquiry</Link>
          </SurfaceCard>
        </SectionInner>
      </SectionWrap>
    </PublicShell>
  )
}
