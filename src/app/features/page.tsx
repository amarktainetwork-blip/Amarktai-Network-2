import Link from 'next/link'
import { ArrowRight, Boxes, Database, FileCheck2, Lock, RadioTower, Route, Sparkles, Users } from 'lucide-react'
import PublicShell from '@/components/public/PublicShell'

const features = [
  ['Capability runtime', 'Apps request work by capability while routing, fallback, budget, quality, and permissions stay centralized.', Route],
  ['Agent layer', 'Marketing, research, automation, customer service, creator, and operations agents run through shared governance.', Users],
  ['Memory and RAG', 'Workspace, app, brand, and retrieval context can be stored and reused without making apps heavy.', Database],
  ['Media generation', 'Images, video, music, audio, voice, avatars, and documents flow into stored artifacts where routes are available.', Sparkles],
  ['Approval gates', 'Generated work can pause for human review before publishing, export, or reuse.', FileCheck2],
  ['Safety controls', 'Adult and sensitive capabilities are permission-gated and unavailable when required policy or runtime setup is missing.', Lock],
  ['Artifact proof', 'Outputs are tracked with status, storage reference, and execution proof instead of unverifiable claims.', Boxes],
  ['Operations view', 'Worker, storage, database, queue, and system signals are surfaced honestly in the control centre.', RadioTower],
] as const

export default function FeaturesPage() {
  return (
    <PublicShell>
      <section className="architecture-band pb-20 pt-24 lg:pb-28 lg:pt-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-blue-300">Features</p>
          <h1 className="mt-5 max-w-5xl text-5xl font-semibold leading-tight text-balance text-white lg:text-7xl">
            One control layer for AI-powered apps that need more than a chat box.
          </h1>
          <p className="mt-7 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
            AmarktAI Network gives product teams a runtime for capability requests, context, generated artifacts, approvals, and operating visibility.
          </p>
        </div>
      </section>

      <section className="bg-[#03050a] py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {features.map(([title, body, Icon]) => (
            <article key={title} className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
              <Icon className="h-6 w-6 text-blue-300" />
              <h2 className="mt-5 text-lg font-black text-white">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-blue-600 py-16 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h2 className="text-3xl font-black tracking-tight lg:text-5xl">Build thin apps on a central AI runtime.</h2>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-blue-50">
              The app focuses on the user workflow. AmarktAI Network handles capability orchestration behind it.
            </p>
          </div>
          <Link href="/admin/login" className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-900">
            Login <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PublicShell>
  )
}
