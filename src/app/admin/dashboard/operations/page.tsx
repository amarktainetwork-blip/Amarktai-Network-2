import { listRecords, LOCAL_STORE_FILES, getStorageRoot, checkWritable } from '@/lib/local-json-store'
import { getCostSummary } from '@/lib/cost-tracking'
import { getResearchToolStatus } from '@/lib/research-tools'
import { getSystemRuntimeStatus } from '@/lib/system-runtime-status'
import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'
import { APPROVED_AI_PROVIDERS } from '@/lib/approved-ai-catalog'
import { getPlatformSettingsTruth } from '@/lib/platform-settings-truth'
import { getCapabilityGovernanceMatrix, ROOT_WORKSPACE } from '@/lib/provider-capability-governance'

export default async function OperationsPage() {
  const [costs, research, system, runtime, settingsTruth] = await Promise.all([
    getCostSummary().catch(() => null),
    getResearchToolStatus().catch(() => null),
    getSystemRuntimeStatus().catch(() => null),
    getDashboardRuntimeTruth().catch(() => null),
    getPlatformSettingsTruth().catch(() => null),
  ])
  const artifacts = listRecords(LOCAL_STORE_FILES.artifacts)
  const approvals = listRecords(LOCAL_STORE_FILES.approvals)
  const jobs = listRecords(LOCAL_STORE_FILES.jobs)
  const storage = checkWritable(LOCAL_STORE_FILES.artifacts)
  const approvedProviderKeys = new Set(APPROVED_AI_PROVIDERS.map((provider) => provider.key))
  const providerRows = (runtime?.providers ?? [])
    .filter((provider) => approvedProviderKeys.has(provider.key as never))
    .map((provider) => ({ name: provider.displayName, status: provider.configured ? provider.status : 'Needs key' }))
  const missingProviders = providerRows.filter((provider) => provider.status !== 'ok' && provider.status !== 'Connected')
  const liveBlockers = [
    ...(!storage.writable ? ['Storage is not writable'] : []),
    ...(system?.vps.status === 'ok' ? [] : ['VPS/Webdock status needs verification']),
    ...(missingProviders.length ? [`Provider tests pending: ${missingProviders.map((provider) => provider.name).join(', ')}`] : []),
    ...(research?.localCrawler.available ? [] : ['Local crawler stack needs Playwright/Trafilatura setup']),
  ]
  const toolStatus = (key: string) => settingsTruth?.tools.find((tool) => tool.key === key)?.status ?? 'Needs key'
  const providerCount = providerRows.filter((provider) => provider.status === 'ok' || provider.status === 'Connected').length
  const studioReady = storage.writable && providerCount > 0
  const workbenchReady = storage.writable && (toolStatus('github') === 'Connected' || settingsTruth?.tools.find((t) => t.key === 'github')?.configured)
  const studioBlockers = [
    ...(!storage.writable ? ['Storage not writable'] : []),
    ...(providerCount === 0 ? ['No AI provider connected'] : []),
  ]
  const workbenchBlockers = [
    ...(!storage.writable ? ['Storage not writable'] : []),
    ...(toolStatus('github') !== 'Connected' ? ['GitHub not connected'] : []),
  ]
  const requiredBlockerCategories = [
    'missing required key',
    'failed live test',
    'broken protected API',
    'broken storage',
    'broken GitHub',
    'broken Studio execution',
    'broken Workbench PR flow',
    'broken static assets',
    'build/lint/test failure',
  ]
  const optionalItems = ['Avatar/talking video backend route', 'Automated memory promotion scheduler', 'Extra providers', 'SMTP enhancements']
  const goLiveCandidate = liveBlockers.length === 0
  const governance = getCapabilityGovernanceMatrix()
  const governanceBlockers = governance.blockedCapabilities.map((capability) => `${capability.label}: ${capability.blocker ?? capability.notes}`)

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl lg:p-7">
        <div className="pointer-events-none absolute right-0 top-0 h-48 w-72 rounded-bl-[6rem] bg-gradient-to-br from-indigo-500/8 via-cyan-500/6 to-transparent blur-3xl" />
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-400/80">Operations</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-100 lg:text-3xl">Runtime command center.</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Provider tests, Studio readiness, Workbench readiness, jobs, artifacts, and cost tracking in one go-live view.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-400/80">Go-live readiness</p>
            <h3 className="mt-1 text-xl font-black text-slate-100">{goLiveCandidate ? 'Ready for live testing' : 'Blocked before go-live'}</h3>
            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-500">
              This panel reports runtime truth from storage, provider health, VPS checks, jobs, artifacts, approvals, and research services. It does not mark unknown routes green.
            </p>
          </div>
          <span className={['rounded-full border px-3 py-1 text-xs font-black', goLiveCandidate ? 'border-emerald-500/20 bg-emerald-500/8 text-emerald-300' : 'border-amber-500/20 bg-amber-500/8 text-amber-300'].join(' ')}>
            Can go live: {goLiveCandidate ? 'yes' : 'no'}
          </span>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <ReadinessList title="Blocking" items={liveBlockers.length ? liveBlockers : ['No runtime blockers detected by this dashboard pass.']} tone={liveBlockers.length ? 'warn' : 'ok'} />
          <ReadinessList title="Optional" items={optionalItems} />
          <ReadinessList title="Live-tested surfaces" items={[
            storage.writable ? 'Storage writable' : 'Storage needs test',
            system?.vps.status === 'ok' ? 'VPS status ok' : 'VPS status pending',
            `${providerRows.filter((provider) => provider.status === 'ok' || provider.status === 'Connected').length} providers connected`,
          ]} />
        </div>
      </section>

      <details className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl">
        <summary className="cursor-pointer text-sm font-black text-slate-200">Advanced governance/debug</summary>
        <h3 className="text-base font-black text-slate-100">Governance blockers and route truth</h3>
        <p className="mt-1.5 text-xs leading-5 text-slate-500">
          {ROOT_WORKSPACE.message} Route-present providers that are not approved are visible, but not executable by default.
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <ReadinessList title="Blocked by governance" items={governanceBlockers.length ? governanceBlockers : ['No governance blockers reported.']} tone={governanceBlockers.length ? 'warn' : 'ok'} />
          <ReadinessList title="Route-present, not approved" items={governance.routePresentNotApprovedProviders.map((provider) => `${provider.label}: ${provider.notes}`)} />
          <ReadinessList title="Available, not wired" items={governance.underusedCapabilities.map((model) => `${model.provider}/${model.modelId}: ${model.capabilities.join(', ')}`).slice(0, 8)} />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {requiredBlockerCategories.map((category) => (
            <div key={category} className="rounded-xl border border-slate-700/40 bg-slate-800/40 p-3 text-xs font-bold text-slate-400">{category}</div>
          ))}
        </div>
      </details>

      {/* Top metrics */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OpsMetric label="VPS / Webdock" value={system?.vps.status ?? 'Needs key'} status={system?.vps.status === 'ok' ? 'ok' : 'warn'} />
        <OpsMetric label="Storage" value={storage.writable ? 'Writable' : 'Needs test'} status={storage.writable ? 'ok' : 'warn'} />
        <OpsMetric label="Month spend" value={`$${(costs?.monthSpendUsd ?? 0).toFixed(2)}`} />
        <OpsMetric label="Pending Approvals" value={String(approvals.length)} status={approvals.length > 0 ? 'warn' : 'ok'} />
      </section>

      {/* Studio + Workbench readiness */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className={['rounded-2xl border p-5 backdrop-blur-xl', studioReady ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-amber-500/20 bg-amber-500/5'].join(' ')}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Studio</p>
              <h3 className="mt-1 text-base font-black text-slate-100">{studioReady ? 'Studio ready' : 'Studio blocked'}</h3>
            </div>
            <span className={['rounded-full border px-2.5 py-1 text-xs font-black', studioReady ? 'border-emerald-500/20 bg-emerald-500/8 text-emerald-300' : 'border-amber-500/20 bg-amber-500/8 text-amber-300'].join(' ')}>
              {studioReady ? 'Ready' : 'Blocked'}
            </span>
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-500">
            {providerCount} provider{providerCount !== 1 ? 's' : ''} connected · Storage {storage.writable ? 'writable' : 'not writable'}
          </p>
          {studioBlockers.length > 0 && (
            <div className="mt-3 space-y-1">
              {studioBlockers.map((blocker) => (
                <p key={blocker} className="rounded-lg border border-amber-500/20 bg-amber-500/8 px-2.5 py-1.5 text-xs font-semibold text-amber-300">{blocker}</p>
              ))}
            </div>
          )}
        </div>
        <div className={['rounded-2xl border p-5 backdrop-blur-xl', workbenchReady ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-amber-500/20 bg-amber-500/5'].join(' ')}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Workbench</p>
              <h3 className="mt-1 text-base font-black text-slate-100">{workbenchReady ? 'Workbench ready' : 'Workbench blocked'}</h3>
            </div>
            <span className={['rounded-full border px-2.5 py-1 text-xs font-black', workbenchReady ? 'border-emerald-500/20 bg-emerald-500/8 text-emerald-300' : 'border-amber-500/20 bg-amber-500/8 text-amber-300'].join(' ')}>
              {workbenchReady ? 'Ready' : 'Blocked'}
            </span>
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-500">
            GitHub {toolStatus('github')} · Storage {storage.writable ? 'writable' : 'not writable'}
          </p>
          {workbenchBlockers.length > 0 && (
            <div className="mt-3 space-y-1">
              {workbenchBlockers.map((blocker) => (
                <p key={blocker} className="rounded-lg border border-amber-500/20 bg-amber-500/8 px-2.5 py-1.5 text-xs font-semibold text-amber-300">{blocker}</p>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <OpsPanel title="Storage / artifacts">
          <OpsRow label="Webdock" value={system?.vps.status ?? 'Needs key/test'} />
          <OpsRow label="Storage" value={storage.writable ? 'Writable' : 'Needs test'} />
          <OpsRow label="Artifacts" value={String(artifacts.length)} />
          <details className="rounded-xl border border-slate-700/40 bg-slate-950/40 p-3">
            <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.14em] text-slate-500">Advanced file paths</summary>
            <div className="mt-3 space-y-2">
              <OpsRow label="Storage root" value={getStorageRoot()} mono />
              <OpsRow label="Artifacts path" value={LOCAL_STORE_FILES.artifacts} mono />
              <OpsRow label="Job logs" value="logs/*.log" mono />
            </div>
          </details>
          {(system?.services ?? []).map((service) => <OpsRow key={service.name} label={service.name} value={service.status} />)}
        </OpsPanel>

        {/* Research stack */}
        <OpsPanel title="Research stack">
          <OpsRow label="Playwright" value={research?.playwright.status ?? 'Unavailable'} />
          <OpsRow label="Scrapy" value={research?.scrapy.status ?? 'Unavailable'} />
          <OpsRow label="Trafilatura" value={research?.trafilatura.status ?? 'Unavailable'} />
          <OpsRow label="Qdrant" value={research?.qdrant.status ?? 'Needs setup'} />
        </OpsPanel>

        <OpsPanel title="Required services">
          <OpsRow label="GitHub" value={toolStatus('github')} />
          <OpsRow label="Redis" value={toolStatus('redis')} />
          <OpsRow label="Playwright" value={toolStatus('playwright')} />
          <OpsRow label="Webdock" value={toolStatus('webdock')} />
          <OpsRow label="Storage" value={settingsTruth?.storage.status ?? (storage.writable ? 'Connected' : 'Failed')} />
        </OpsPanel>

        {/* Usage */}
        <OpsPanel title="Costs / usage">
          <OpsRow label="Today spend" value={`$${(costs?.todaySpendUsd ?? 0).toFixed(2)}`} />
          <OpsRow label="Artifacts" value={String(artifacts.length)} />
          <OpsRow label="Jobs" value={String(jobs.length)} />
          <OpsRow label="Provider usage" value={Object.keys(costs?.byProvider ?? {}).join(', ') || 'No runs yet'} />
          <OpsRow label="App usage" value={Object.keys(costs?.byApp ?? {}).join(', ') || 'No runs yet'} />
        </OpsPanel>
        <OpsPanel title="Redis / jobs">
          <OpsRow label="Active jobs" value={String(jobs.filter((job) => ['pending', 'processing', 'running'].includes(String((job as { status?: unknown }).status))).length)} />
          <OpsRow label="Recent failed jobs" value={String(jobs.filter((job) => String((job as { status?: unknown }).status).includes('fail')).slice(-10).length)} />
          <OpsRow label="Recent artifacts" value={String(artifacts.slice(-10).length)} />
          <OpsRow label="Workbench jobs" value={String(jobs.filter((job) => String((job as { type?: unknown; source?: unknown }).type ?? (job as { source?: unknown }).source).includes('workbench')).length)} />
          <OpsRow label="Studio jobs" value={String(jobs.filter((job) => String((job as { type?: unknown; source?: unknown }).type ?? (job as { source?: unknown }).source).includes('studio')).length)} />
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

function ReadinessList({ title, items, tone = 'neutral' }: { title: string; items: string[]; tone?: 'neutral' | 'warn' | 'ok' }) {
  const color = tone === 'ok' ? 'text-emerald-300' : tone === 'warn' ? 'text-amber-300' : 'text-slate-300'
  return (
    <div className="rounded-xl border border-slate-700/40 bg-slate-800/40 p-3">
      <p className={['text-xs font-black', color].join(' ')}>{title}</p>
      <div className="mt-2 space-y-1.5">
        {items.map((item) => (
          <p key={item} className="text-xs font-semibold leading-5 text-slate-500">{item}</p>
        ))}
      </div>
    </div>
  )
}
