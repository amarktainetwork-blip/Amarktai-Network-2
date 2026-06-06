import Link from 'next/link'
import { ArrowRight, Command, Library, ShieldCheck } from 'lucide-react'
import { PRODUCT_POSITIONING } from '@/lib/product-contract'
import { listRecords, LOCAL_STORE_FILES } from '@/lib/local-json-store'
import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'

type Artifact = { id: string; title?: string; type?: string; createdAt?: string }
type CommandJob = { id: string; prompt: string; status: string; route?: { intent?: string; surface?: string }; createdAt: string }

export default async function OverviewPage() {
  const artifacts = listRecords<Artifact>(LOCAL_STORE_FILES.artifacts).slice(-5).reverse()
  const jobs = listRecords<CommandJob>('jobs/command-jobs.json').slice(-5).reverse()
  const runtime = await getDashboardRuntimeTruth().catch(() => null)
  const ready = Boolean(runtime && runtime.blockers.length === 0)
  const warnings = [
    ...(!runtime ? ['Runtime readiness could not be checked. Open System for details.'] : []),
    ...(runtime && runtime.blockers.length > 0 ? ['Some live capabilities still need setup. Open Settings for the exact actions.'] : []),
  ]

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-3xl border border-cyan-400/20 bg-[linear-gradient(135deg,rgba(8,20,34,.96),rgba(4,9,18,.92))] p-6 shadow-[0_20px_80px_rgba(8,145,178,.08)] lg:p-8">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Overview</p>
        <div className="mt-3 grid gap-6 xl:grid-cols-[1fr_360px] xl:items-end">
          <div>
            <h1 className="max-w-4xl text-3xl font-black tracking-tight text-white lg:text-5xl">One intelligent command layer for the whole network.</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">{PRODUCT_POSITIONING}</p>
          </div>
          <Link href="/admin/dashboard/workspace" className="group rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-5 transition hover:bg-cyan-400/15">
            <Command className="h-7 w-7 text-cyan-300" />
            <p className="mt-4 text-lg font-black text-white">Open Workspace</p>
            <p className="mt-1 text-sm leading-6 text-slate-300">Describe the outcome. Amarktai chooses the right capability and shows the next step.</p>
            <span className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-cyan-300">Start <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
          </Link>
        </div>
      </section>

      {warnings.length > 0 && (
        <section className="rounded-2xl border border-amber-400/20 bg-amber-400/8 p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-300">Action needed</p>
          {warnings.map((warning) => <p key={warning} className="mt-2 text-sm text-amber-100/80">{warning}</p>)}
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<Command />} label="Active workspace jobs" value={String(jobs.filter((job) => job.status !== 'completed').length)} />
        <Metric icon={<Library />} label="Recent outputs" value={String(artifacts.length)} />
        <Metric icon={<ShieldCheck />} label="Readiness" value={ready ? 'Ready' : 'Needs setup'} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="Current jobs" empty="No workspace jobs yet. Open Workspace to start one.">
          {jobs.map((job) => (
            <div key={job.id} className="rounded-xl border border-slate-700/40 bg-slate-950/45 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-bold text-slate-200">{job.prompt}</p>
                <Status value={job.status} />
              </div>
              <p className="mt-1 text-xs text-slate-400">{job.route?.surface ? `${job.route.surface} work` : 'Command work'}</p>
            </div>
          ))}
        </Panel>
        <Panel title="Recent outputs" empty="Generated media, reports, builds, diffs, and PRs appear here.">
          {artifacts.map((artifact) => (
            <div key={artifact.id} className="rounded-xl border border-slate-700/40 bg-slate-950/45 p-3">
              <p className="text-sm font-bold text-slate-200">{artifact.title || artifact.id}</p>
              <p className="mt-1 text-xs text-slate-500">{artifact.type || 'artifact'}</p>
            </div>
          ))}
        </Panel>
      </section>
    </div>
  )
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4"><div className="h-5 w-5 text-cyan-300">{icon}</div><p className="mt-4 text-xs font-bold text-slate-400">{label}</p><p className="mt-1 text-xl font-black text-white">{value}</p></div>
}

function Panel({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children)
  return <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5"><h2 className="font-black text-white">{title}</h2><div className="mt-4 space-y-2">{hasChildren ? children : <p className="text-sm text-slate-400">{empty}</p>}</div></section>
}

function Status({ value }: { value: string }) {
  const ready = value === 'ready' || value === 'completed'
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${ready ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/20 bg-amber-400/10 text-amber-300'}`}>{value}</span>
}
