import { listRecords, LOCAL_STORE_FILES, getStorageRoot, checkWritable } from '@/lib/local-json-store'
import { getCostSummary } from '@/lib/cost-tracking'
import { getResearchToolStatus } from '@/lib/research-tools'
import { getSystemRuntimeStatus } from '@/lib/system-runtime-status'

export default async function OperationsPage() {
  const [costs, research, system] = await Promise.all([
    getCostSummary().catch(() => null),
    getResearchToolStatus().catch(() => null),
    getSystemRuntimeStatus().catch(() => null),
  ])
  const artifacts = listRecords(LOCAL_STORE_FILES.artifacts)
  const approvals = listRecords(LOCAL_STORE_FILES.approvals)
  const jobs = listRecords('jobs/jobs.json')
  const storage = checkWritable(LOCAL_STORE_FILES.artifacts)

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-[0_24px_100px_rgba(15,23,42,0.12)] backdrop-blur-2xl lg:p-8">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-700">Operations</p>
        <h2 className="mt-3 max-w-4xl text-4xl font-black tracking-tight text-slate-950 lg:text-5xl">VPS, storage, jobs, approvals, and monitoring.</h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
          Operations unifies costs, actions, system status, Webdock, queues, artifacts, logs, provider usage, app usage, and storage health.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <Metric label="VPS/Webdock" value={system?.vps.status ?? 'Needs key/test'} />
        <Metric label="Storage" value={storage.writable ? 'Writable' : 'Needs test'} />
        <Metric label="Month spend" value={`$${(costs?.monthSpendUsd ?? 0).toFixed(2)}`} />
        <Metric label="Approvals" value={String(approvals.length)} />
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <Panel title="VPS and services" rows={[
          ['Webdock', system?.vps.status ?? 'Needs key/test'],
          ['Storage root', getStorageRoot()],
          ['Artifact path', LOCAL_STORE_FILES.artifacts],
          ['Job logs', 'logs/*.log'],
          ...(system?.services.map((service) => [service.name, service.status]) ?? []),
        ]} />
        <Panel title="Research stack" rows={[
          ['Firecrawl', research?.firecrawl.status ?? 'Needs key/test'],
          ['Crawl4AI', research?.crawl4ai.status ?? 'Unavailable'],
          ['Playwright', research?.playwright.status ?? 'Unavailable'],
        ]} />
        <Panel title="Usage monitoring" rows={[
          ['Today spend', `$${(costs?.todaySpendUsd ?? 0).toFixed(2)}`],
          ['Artifacts', String(artifacts.length)],
          ['Jobs', String(jobs.length)],
          ['Provider usage', Object.keys(costs?.byProvider ?? {}).join(', ') || 'No runs yet'],
          ['App usage', Object.keys(costs?.byApp ?? {}).join(', ') || 'No runs yet'],
        ]} />
      </section>

      <section className="rounded-3xl border border-white/70 bg-white/65 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl">
        <h3 className="text-xl font-black text-slate-950">Recent expensive runs</h3>
        <div className="mt-5 space-y-2">
          {(costs?.recentExpensiveRuns ?? []).map((run) => (
            <div key={run.id} className="rounded-2xl border border-slate-200 bg-white/75 px-4 py-3 text-sm font-semibold text-slate-600">
              ${run.estimatedCostUsd.toFixed(2)} - {run.appSlug} - {run.agentId ?? 'operator'} - {run.provider}/{run.model}
            </div>
          ))}
          {!costs?.recentExpensiveRuns?.length && <p className="text-sm font-semibold text-slate-500">Cost monitoring is active; runs appear after Studio, Workbench, or agent execution.</p>}
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/65 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 truncate text-lg font-black text-slate-950">{value}</p>
    </div>
  )
}

function Panel({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/65 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl">
      <h3 className="text-xl font-black text-slate-950">{title}</h3>
      <div className="mt-5 space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 border-b border-slate-200/70 pb-3 last:border-b-0 last:pb-0">
            <span className="text-sm font-bold text-slate-500">{label}</span>
            <span className="max-w-[60%] break-words text-right text-sm font-black text-slate-800">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
