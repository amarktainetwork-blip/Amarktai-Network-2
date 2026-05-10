import Link from 'next/link'
import { BrainCircuit, GitBranch, GraduationCap, Settings2, Sparkles } from 'lucide-react'
import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'
import { getSystemRuntimeStatus } from '@/lib/system-runtime-status'
import { getCostSummary } from '@/lib/cost-tracking'
import { getResearchToolStatus } from '@/lib/research-tools'
import { listRecords, LOCAL_STORE_FILES, getStorageRoot, checkWritable } from '@/lib/local-json-store'
import { APPROVED_AI_PROVIDERS } from '@/lib/approved-ai-catalog'

export default async function OverviewPage() {
  const [system, runtime, costs, research] = await Promise.all([
    getSystemRuntimeStatus().catch(() => null),
    getDashboardRuntimeTruth().catch(() => null),
    getCostSummary().catch(() => null),
    getResearchToolStatus().catch(() => null),
  ])

  const artifacts = listRecords(LOCAL_STORE_FILES.artifacts)
  const jobs = listRecords('jobs/jobs.json')
  const storage = checkWritable(LOCAL_STORE_FILES.artifacts)

  const approvedKeys = new Set(APPROVED_AI_PROVIDERS.map((p) => p.key))
  const providerRows = (runtime?.providers ?? [])
    .filter((p) => approvedKeys.has(p.key as never))
    .map((p) => ({ key: p.key, name: p.displayName, configured: p.configured, status: p.configured ? p.status : 'Needs key' }))

  const configuredCount = providerRows.filter((p) => p.configured).length
  const needsKeyCount = providerRows.filter((p) => !p.configured).length
  const appCount = runtime?.localCore.apps.count ?? 0
  const agentCount = runtime?.localCore.agents.count ?? 0
  const storageRoot = getStorageRoot()

  const activeJobs = (jobs as Array<{ status?: string }>).filter((j) =>
    ['pending', 'processing', 'running'].includes(String(j.status ?? '')),
  ).length

  // System health score and readiness
  const storageOk = storage.writable
  const providersOk = configuredCount > 0
  const runtimeOk = Boolean(system?.services.find((s) => s.name === 'node')?.version)
  const healthScore = [storageOk, providersOk, runtimeOk].filter(Boolean).length
  const systemHealthy = storageOk && providersOk

  // Blockers and remedies
  const blockerItems: Array<{ msg: string; remedy: string }> = [
    ...(!storageOk ? [{ msg: 'Storage is not writable', remedy: 'Ensure the storage directory exists and is writable, or set AMARKTAI_STORAGE_ROOT in your environment.' }] : []),
    ...(!providersOk ? [{ msg: 'No AI provider configured', remedy: 'Add at least one provider key in Settings. GenX is recommended as the primary routing layer.' }] : []),
    ...(system?.vps.status !== 'Configured' ? [{ msg: 'VPS monitoring not configured', remedy: 'Add WEBDOCK_API_KEY in Settings → Webdock to enable VPS monitoring.' }] : []),
    ...(!research?.firecrawl.configured && !research?.playwright.available ? [{ msg: 'Research stack limited', remedy: 'Add FIRECRAWL_API_KEY in Settings to enable web research and scraping.' }] : []),
  ]

  const nodeService = system?.services.find((s) => s.name === 'node')

  return (
    <div className="space-y-5">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl lg:p-7">
        <div className="pointer-events-none absolute right-0 top-0 h-56 w-80 rounded-bl-[8rem] bg-gradient-to-br from-cyan-500/8 via-indigo-500/5 to-transparent blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-400/80">AmarktAI Network</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-100 lg:text-3xl">Root AI operating system.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              This is your command center for {appCount > 0 ? `${appCount} connected app${appCount !== 1 ? 's' : ''}` : 'connected apps'}, AI agents, the repo workbench, memory, and all runtime services.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <span className={[
              'rounded-full border px-3.5 py-1.5 text-xs font-black',
              systemHealthy ? 'border-emerald-500/25 bg-emerald-500/8 text-emerald-300' : 'border-amber-500/25 bg-amber-500/8 text-amber-300',
            ].join(' ')}>
              {systemHealthy ? 'System operational' : 'Needs attention'}
            </span>
            <div className="flex gap-3">
              <HeroStat label="Apps" value={String(appCount || '—')} />
              <HeroStat label="Agents" value={String(agentCount || '—')} />
              <HeroStat label="Providers" value={`${configuredCount}/${APPROVED_AI_PROVIDERS.length}`} accent={providersOk} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Top metrics ──────────────────────────────────────────────────── */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Storage"
          value={storageOk ? 'Writable' : 'Needs check'}
          sub={storageRoot.length > 36 ? `…${storageRoot.slice(-32)}` : storageRoot}
          health={storageOk ? 'ok' : 'warn'}
        />
        <MetricCard
          label="AI Providers"
          value={`${configuredCount} active`}
          sub={needsKeyCount > 0 ? `${needsKeyCount} need key` : 'All configured'}
          health={configuredCount > 0 ? 'ok' : 'warn'}
        />
        <MetricCard
          label="Jobs / Queue"
          value={activeJobs > 0 ? `${activeJobs} active` : 'Idle'}
          sub={`${jobs.length} total · ${artifacts.length} artifacts`}
          health={activeJobs > 0 ? 'pulse' : 'ok'}
        />
        <MetricCard
          label="Runtime health"
          value={healthScore === 3 ? 'All systems go' : `${healthScore}/3 checks`}
          sub={nodeService?.version ? nodeService.version.split(' ')[0] : 'Runtime info loading'}
          health={healthScore === 3 ? 'ok' : 'warn'}
        />
      </section>

      {/* ── Blockers ─────────────────────────────────────────────────────── */}
      {blockerItems.length > 0 && (
        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 backdrop-blur-xl">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400/80">Action required</p>
          <h2 className="mt-1 text-base font-black text-slate-100">{blockerItems.length} item{blockerItems.length !== 1 ? 's' : ''} need attention before this system is fully operational</h2>
          <div className="mt-4 space-y-2.5">
            {blockerItems.map((item) => (
              <div key={item.msg} className="rounded-xl border border-amber-500/15 bg-slate-900/60 p-3.5">
                <p className="text-sm font-black text-amber-300">{item.msg}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{item.remedy}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Provider health ──────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400/80">Provider health</p>
            <h2 className="mt-1 text-base font-black text-slate-100">
              {configuredCount} of {APPROVED_AI_PROVIDERS.length} approved providers configured
            </h2>
          </div>
          <Link href="/admin/dashboard/settings" className="rounded-lg border border-slate-700/60 bg-slate-800/50 px-3 py-1.5 text-xs font-black text-slate-400 hover:text-slate-200 transition-colors">
            Configure →
          </Link>
        </div>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {providerRows.map(({ name, configured, status }) => (
            <ProviderCard key={name} name={name} configured={configured} status={String(status)} />
          ))}
          {!providerRows.length && (
            <p className="col-span-4 text-sm font-semibold text-slate-500">Runtime provider data unavailable.</p>
          )}
        </div>
      </section>

      {/* ── VPS & Runtime ────────────────────────────────────────────────── */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400/80">VPS &amp; runtime</p>
          <h2 className="mt-1 text-sm font-black text-slate-200">Host services</h2>
          <div className="mt-4 space-y-2.5">
            <RuntimeRow label="VPS / Webdock" value={system?.vps.status ?? 'Unavailable'} ok={system?.vps.status === 'Configured'} />
            <RuntimeRow label="Storage root" value={storageRoot} mono />
            <RuntimeRow label="Storage state" value={storageOk ? 'Writable' : 'Not writable'} ok={storageOk} />
            {(system?.services ?? []).map((s) => (
              <RuntimeRow key={s.name} label={s.name} value={s.version ? `${s.status} · ${s.version}` : s.status} ok={s.status === 'Available'} />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400/80">Research &amp; tools</p>
          <h2 className="mt-1 text-sm font-black text-slate-200">Research stack</h2>
          <div className="mt-4 space-y-2.5">
            <RuntimeRow label="Firecrawl" value={research?.firecrawl.status ?? 'Needs key/test'} ok={research?.firecrawl.configured} />
            <RuntimeRow label="Playwright" value={research?.playwright.status ?? 'Unavailable'} ok={research?.playwright.available} />
            <RuntimeRow label="Crawl4AI" value={research?.crawl4ai.status ?? 'Unavailable'} ok={research?.crawl4ai.available} />
          </div>
          <div className="mt-5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400/80">Local storage</p>
            <div className="mt-3 space-y-2.5">
              <RuntimeRow label="Artifacts" value={`${artifacts.length} stored`} ok={storageOk} />
              <RuntimeRow label="Jobs" value={`${jobs.length} total · ${activeJobs} active`} ok />
              <RuntimeRow label="Local apps" value={`${appCount} registered`} ok={appCount > 0} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Costs & activity ─────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400/80">Costs &amp; activity</p>
        <h2 className="mt-1 text-sm font-black text-slate-200">AI usage this period</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <CostStat label="Today" value={`$${(costs?.todaySpendUsd ?? 0).toFixed(2)}`} />
          <CostStat label="This month" value={`$${(costs?.monthSpendUsd ?? 0).toFixed(2)}`} />
          <CostStat label="Artifacts saved" value={String(artifacts.length)} />
          <CostStat label="Jobs run" value={String(jobs.length)} />
        </div>
        {(costs?.recentExpensiveRuns?.length ?? 0) > 0 && (
          <div className="mt-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Recent runs</p>
            <div className="mt-2 space-y-1.5">
              {(costs?.recentExpensiveRuns ?? []).slice(0, 5).map((run) => (
                <div key={run.id} className="rounded-lg border border-slate-700/40 bg-slate-800/50 px-3 py-2 text-xs font-semibold text-slate-400">
                  <span className="text-cyan-400">${run.estimatedCostUsd.toFixed(4)}</span>
                  {' · '}{run.appSlug}{' · '}{run.provider}/{run.model}
                </div>
              ))}
            </div>
          </div>
        )}
        {!costs?.recentExpensiveRuns?.length && (
          <p className="mt-3 text-xs font-semibold text-slate-600">No cost runs recorded yet. Run a Studio task or Workbench job to begin tracking.</p>
        )}
      </section>

      {/* ── App readiness ────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400/80">Platform readiness</p>
        <h2 className="mt-1 text-sm font-black text-slate-200">Ready to serve 15–25 connected apps?</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <ReadinessRow label="Local storage" ok={storageOk} note={storageOk ? 'Artifacts, memory, and jobs can be saved' : 'Storage must be writable to serve any app'} />
          <ReadinessRow label="AI providers" ok={providersOk} note={providersOk ? `${configuredCount} provider${configuredCount !== 1 ? 's' : ''} ready for routing` : 'At least one provider key required'} />
          <ReadinessRow label="Runtime environment" ok={runtimeOk} note={runtimeOk ? `Node ${nodeService?.version?.split(' ')[0] ?? 'v18+'} · git available` : 'Node or git not detected'} />
          <ReadinessRow label="VPS monitoring" ok={system?.vps.status === 'Configured'} note={system?.vps.status === 'Configured' ? 'Webdock key configured' : 'Add Webdock key for VPS monitoring'} />
          <ReadinessRow label="Research stack" ok={Boolean(research?.firecrawl.configured || research?.playwright.available)} note={research?.firecrawl.configured ? 'Firecrawl configured' : research?.playwright.available ? 'Playwright available locally' : 'Add Firecrawl key to enable research'} />
          <ReadinessRow label="GenX gateway" ok={Boolean(runtime?.genx.configured)} note={runtime?.genx.configured ? `${runtime.genx.modelCount} models available` : 'GenX key not configured — routing will use direct providers'} />
        </div>
      </section>

      {/* ── Quick navigation ─────────────────────────────────────────────── */}
      <section>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Quick access</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <QuickNavCard href="/admin/dashboard/studio" icon={<Sparkles className="h-5 w-5" />} label="Studio" desc="Chat, research, image, voice, adult, coding handoff" />
          <QuickNavCard href="/admin/dashboard/workbench" icon={<GitBranch className="h-5 w-5" />} label="Workbench" desc="Autonomous repo workflow — plan, patch, PR, deploy" />
          <QuickNavCard href="/admin/dashboard/apps-agents" icon={<BrainCircuit className="h-5 w-5" />} label="Apps & Agents" desc="Connected apps, model packages, agent registry" />
          <QuickNavCard href="/admin/dashboard/memory-learning" icon={<GraduationCap className="h-5 w-5" />} label="Memory & Learning" desc="Persistent context, learning logs, artifact links" />
          <QuickNavCard href="/admin/dashboard/settings" icon={<Settings2 className="h-5 w-5" />} label="Settings" desc="Provider keys, routing, adult policy, storage, deploy" />
        </div>
      </section>

    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HeroStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={['rounded-xl border px-3 py-2', accent ? 'border-cyan-500/20 bg-cyan-500/8' : 'border-slate-700/40 bg-slate-800/40'].join(' ')}>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={['mt-0.5 text-lg font-black', accent ? 'text-cyan-300' : 'text-slate-200'].join(' ')}>{value}</p>
    </div>
  )
}

function MetricCard({ label, value, sub, health }: { label: string; value: string; sub: string; health: 'ok' | 'warn' | 'pulse' }) {
  const valueColor = health === 'ok' ? 'text-emerald-400' : health === 'warn' ? 'text-amber-400' : 'text-cyan-400'
  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4 backdrop-blur-xl">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={['mt-2 text-lg font-black', valueColor].join(' ')}>{value}</p>
      <p className="mt-1 truncate text-[11px] font-semibold text-slate-600">{sub}</p>
    </div>
  )
}

function ProviderCard({ name, configured, status }: { name: string; configured: boolean; status: string }) {
  const statusColor = configured ? 'text-emerald-400' : 'text-amber-400'
  const badge = configured ? 'border-emerald-500/20 bg-emerald-500/8 text-emerald-300' : 'border-amber-500/20 bg-amber-500/8 text-amber-300'
  return (
    <div className="rounded-xl border border-slate-700/40 bg-slate-800/50 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-black text-slate-200">{name}</p>
        <span className={['shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black', badge].join(' ')}>
          {configured ? 'OK' : 'Key'}
        </span>
      </div>
      <p className={['mt-1.5 text-[11px] font-semibold', statusColor].join(' ')}>{String(status)}</p>
    </div>
  )
}

function RuntimeRow({ label, value, mono = false, ok }: { label: string; value: string; mono?: boolean; ok?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-800/60 pb-2.5 last:border-0 last:pb-0">
      <span className="shrink-0 text-xs font-bold text-slate-500">{label}</span>
      <span className={['max-w-[60%] break-words text-right text-xs font-bold', mono ? 'font-mono text-slate-400' : ok === false ? 'text-amber-400' : ok ? 'text-emerald-400' : 'text-slate-300'].join(' ')}>
        {value}
      </span>
    </div>
  )
}

function CostStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-700/40 bg-slate-800/40 p-3.5">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1.5 text-lg font-black text-slate-200">{value}</p>
    </div>
  )
}

function ReadinessRow({ label, ok, note }: { label: string; ok: boolean; note: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-700/40 bg-slate-800/40 p-3.5">
      <span className={['mt-0.5 h-2 w-2 shrink-0 rounded-full', ok ? 'bg-emerald-400' : 'bg-amber-400'].join(' ')} />
      <div className="min-w-0">
        <p className="text-xs font-black text-slate-200">{label}</p>
        <p className="mt-0.5 text-[11px] font-semibold leading-4 text-slate-500">{note}</p>
      </div>
    </div>
  )
}

function QuickNavCard({ href, icon, label, desc }: { href: string; icon: React.ReactNode; label: string; desc: string }) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3.5 rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4 backdrop-blur-xl transition-all duration-200 hover:border-cyan-500/30 hover:bg-cyan-500/5"
    >
      <span className="mt-0.5 text-slate-600 transition-colors group-hover:text-cyan-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-black text-slate-200 group-hover:text-cyan-300 transition-colors">{label}</p>
        <p className="mt-0.5 text-xs font-semibold leading-4 text-slate-500">{desc}</p>
      </div>
    </Link>
  )
}
