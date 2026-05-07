import { listRecords, LOCAL_STORE_FILES, getStorageRoot, checkWritable } from '@/lib/local-json-store'
import { getCostSummary } from '@/lib/cost-tracking'
import { getResearchToolStatus } from '@/lib/research-tools'
import { getSystemRuntimeStatus } from '@/lib/system-runtime-status'
import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'
import { APPROVED_AI_PROVIDERS } from '@/lib/approved-ai-catalog'

export default async function OperationsPage() {
  const [costs, research, system, runtime] = await Promise.all([
    getCostSummary().catch(() => null),
    getResearchToolStatus().catch(() => null),
    getSystemRuntimeStatus().catch(() => null),
    getDashboardRuntimeTruth().catch(() => null),
  ])
  const artifacts = listRecords(LOCAL_STORE_FILES.artifacts)
  const approvals = listRecords(LOCAL_STORE_FILES.approvals)
  const jobs = listRecords('jobs/jobs.json')
  const storage = checkWritable(LOCAL_STORE_FILES.artifacts)
  const approvedProviderKeys = new Set(APPROVED_AI_PROVIDERS.map((provider) => provider.key))
  const providerRows = (runtime?.providers ?? [])
    .filter((provider) => approvedProviderKeys.has(provider.key as never))
    .map((provider) => ({ name: provider.displayName, status: provider.configured ? provider.status : 'Needs key' }))

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl lg:p-7">
        <div className="pointer-events-none absolute right-0 top-0 h-48 w-72 rounded-bl-[6rem] bg-gradient-to-br from-indigo-500/8 via-cyan-500/6 to-transparent blur-3xl" />
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-400/80">Operations</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-100 lg:text-3xl">Runtime command center.</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          VPS health · storage · jobs · approvals · provider truth · cost tracking — unified operational view.
        </p>
      </section>

      {/* Top metrics */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OpsMetric label="VPS / Webdock" value={system?.vps.status ?? 'Needs key'} status={system?.vps.status === 'ok' ? 'ok' : 'warn'} />
        <OpsMetric label="Storage" value={storage.writable ? 'Writable' : 'Needs test'} status={storage.writable ? 'ok' : 'warn'} />
        <OpsMetric label="Month spend" value={`$${(costs?.monthSpendUsd ?? 0).toFixed(2)}`} />
        <OpsMetric label="Pending Approvals" value={String(approvals.length)} status={approvals.length > 0 ? 'warn' : 'ok'} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {/* VPS & Services */}
        <OpsPanel title="VPS & services">
          <OpsRow label="Webdock" value={system?.vps.status ?? 'Needs key/test'} />
          <OpsRow label="Storage root" value={getStorageRoot()} mono />
          <OpsRow label="Artifacts path" value={LOCAL_STORE_FILES.artifacts} mono />
          <OpsRow label="Job logs" value="logs/*.log" mono />
          {(system?.services ?? []).map((service) => <OpsRow key={service.name} label={service.name} value={service.status} />)}
        </OpsPanel>

        {/* Research stack */}
        <OpsPanel title="Research stack">
          <OpsRow label="Firecrawl" value={research?.firecrawl.status ?? 'Needs key/test'} />
          <OpsRow label="Crawl4AI" value={research?.crawl4ai.status ?? 'Unavailable'} />
          <OpsRow label="Playwright" value={research?.playwright.status ?? 'Unavailable'} />
        </OpsPanel>

        {/* Usage */}
        <OpsPanel title="Usage">
          <OpsRow label="Today spend" value={`$${(costs?.todaySpendUsd ?? 0).toFixed(2)}`} />
          <OpsRow label="Artifacts" value={String(artifacts.length)} />
          <OpsRow label="Jobs" value={String(jobs.length)} />
          <OpsRow label="Provider usage" value={Object.keys(costs?.byProvider ?? {}).join(', ') || 'No runs yet'} />
          <OpsRow label="App usage" value={Object.keys(costs?.byApp ?? {}).join(', ') || 'No runs yet'} />
        </OpsPanel>
      </section>

      {/* Provider health */}
      <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl">
        <h3 className="text-base font-black text-slate-100">Provider health truth</h3>
        <p className="mt-1.5 text-xs leading-5 text-slate-500">
          Only approved providers shown. Status derived from runtime key resolution — not static claims.
        </p>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {providerRows.map(({ name, status }) => (
            <div key={name} className="rounded-xl border border-slate-700/40 bg-slate-800/50 p-3">
              <p className="text-xs font-black text-slate-200">{name}</p>
              <p className={['mt-1 text-xs font-semibold', status === 'ok' || status === 'Connected' ? 'text-emerald-400' : status === 'Needs key' ? 'text-amber-400' : 'text-slate-500'].join(' ')}>{status}</p>
            </div>
          ))}
          {!providerRows.length && <p className="text-sm font-semibold text-slate-500">Runtime provider truth unavailable.</p>}
        </div>
      </section>

      {/* Recent expensive runs */}
      <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl">
        <h3 className="text-base font-black text-slate-100">Recent expensive runs</h3>
        <div className="mt-4 space-y-2">
          {(costs?.recentExpensiveRuns ?? []).map((run) => (
            <div key={run.id} className="rounded-xl border border-slate-700/40 bg-slate-800/50 px-3 py-2.5 text-sm font-semibold text-slate-400">
              <span className="text-cyan-400">${run.estimatedCostUsd.toFixed(4)}</span> — {run.appSlug} — {run.agentId ?? 'operator'} — {run.provider}/{run.model}
            </div>
          ))}
          {!costs?.recentExpensiveRuns?.length && (
            <p className="text-sm font-semibold text-slate-500">No cost runs recorded yet.</p>
          )}
        </div>
      </section>
    </div>
  )
}

function OpsMetric({ label, value, status }: { label: string; value: string; status?: 'ok' | 'warn' | 'error' }) {
  const color = status === 'ok' ? 'text-emerald-400' : status === 'warn' ? 'text-amber-400' : status === 'error' ? 'text-red-400' : 'text-slate-200'
  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4 backdrop-blur-xl">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={['mt-2 truncate text-lg font-black', color].join(' ')}>{value}</p>
    </div>
  )
}

function OpsPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4 backdrop-blur-xl">
      <h3 className="text-sm font-black text-slate-200">{title}</h3>
      <div className="mt-4 space-y-2.5">
        {children}
      </div>
    </div>
  )
}

function OpsRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-800/60 pb-2.5 last:border-0 last:pb-0">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <span className={['max-w-[58%] break-words text-right text-xs font-bold text-slate-300', mono ? 'font-mono' : ''].join(' ')}>{value}</span>
    </div>
  )
}
