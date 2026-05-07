import { OPERATOR_AGENTS, listOperatorAgents } from '@/lib/agent-registry'
import { listAppAiPackages } from '@/lib/app-ai-package-store'
import { ADULT_POLICY_VALUES } from '@/lib/universal-model-catalog'

const appFields = [
  'name', 'slug', 'domain/subdomain', 'repo', 'VPS path', 'service name',
  'health endpoint', 'app type', 'assigned agents', 'assigned model package',
  'memory namespace', 'storage namespace', 'adult policy', 'deployment profile', 'status',
]

const appTypes = ['companion/chat', 'marketing', 'coding/dev', 'research', 'media/avatar', 'operations', 'custom']

export default async function AppsAgentsPage() {
  const [packages, agents] = await Promise.all([
    listAppAiPackages().catch(() => []),
    Promise.resolve(listOperatorAgents('superbrain')),
  ])

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl lg:p-7">
        <div className="pointer-events-none absolute right-0 top-0 h-48 w-72 rounded-bl-[6rem] bg-gradient-to-br from-violet-500/8 via-cyan-500/5 to-transparent blur-3xl" />
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-400/80">Apps & Agents</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-100 lg:text-3xl">Connected app orchestration.</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Apps run from this VPS. The Superbrain assigns model packages, agents, memory, storage, adult policy, and deployment profiles.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {['Registry available', 'Package store active', 'Agent dispatch wired'].map((s) => (
            <span key={s} className="rounded-full border border-slate-700/50 bg-slate-800/50 px-2.5 py-1 text-[10px] font-bold text-slate-400">{s}</span>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        {/* App schema */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl">
          <h3 className="text-sm font-black text-slate-200">App package schema</h3>
          <p className="mt-2 text-xs leading-5 text-slate-500">One VPS-aware structure per app. No implied separate infrastructure.</p>
          <div className="mt-4 grid gap-1.5 sm:grid-cols-2">
            {appFields.map((field) => (
              <div key={field} className="rounded-lg border border-slate-700/40 bg-slate-800/40 px-2.5 py-1.5 text-xs font-semibold text-slate-400">{field}</div>
            ))}
          </div>
          <h4 className="mt-5 text-xs font-black text-slate-300">App types</h4>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {appTypes.map((type) => <span key={type} className="rounded-full border border-cyan-500/20 bg-cyan-500/8 px-2.5 py-1 text-xs font-bold text-cyan-400">{type}</span>)}
          </div>
          <h4 className="mt-5 text-xs font-black text-slate-300">Adult policy values</h4>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ADULT_POLICY_VALUES.map((policy) => <span key={policy} className="rounded-full border border-slate-700/40 bg-slate-800/40 px-2.5 py-1 text-xs font-bold text-slate-400">{policy}</span>)}
          </div>
        </div>

        {/* App packages */}
        <div className="space-y-3">
          {packages.map((pkg) => (
            <article key={pkg.appSlug} className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4 backdrop-blur-xl">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-black text-slate-100">{pkg.appName}</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">{pkg.appSlug} · {(pkg as { domain?: string }).domain || 'domain needed'} · {pkg.appType}</p>
                </div>
                <span className="inline-flex rounded-full border border-cyan-500/20 bg-cyan-500/8 px-2.5 py-1 text-xs font-bold text-cyan-400">{pkg.modelStrategy ?? pkg.budget?.mode ?? 'balanced'}</span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <AgentDetail label="Repo" value={(pkg as { repo?: string }).repo ?? 'Configured in Workbench'} />
                <AgentDetail label="VPS path" value={(pkg as { vpsPath?: string }).vpsPath ?? '/var/www/amarktai/apps'} />
                <AgentDetail label="Service" value={(pkg as { serviceName?: string }).serviceName ?? `${pkg.appSlug}.service`} />
                <AgentDetail label="Memory" value={(pkg as { memoryNamespace?: string }).memoryNamespace ?? `app:${pkg.appSlug}`} />
                <AgentDetail label="Storage" value={(pkg as { storageNamespace?: string }).storageNamespace ?? `apps/${pkg.appSlug}`} />
                <AgentDetail label="Adult policy" value={pkg.adultPolicy ?? 'off'} />
              </div>
            </article>
          ))}
          {!packages.length && (
            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl">
              <p className="font-black text-slate-300">No app packages saved yet.</p>
              <p className="mt-1.5 text-sm text-slate-500">Package store available. Assignment UI wiring pending — no placeholder data shown.</p>
            </div>
          )}
        </div>
      </section>

      {/* Agent registry */}
      <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl">
        <h3 className="text-sm font-black text-slate-200">Agent registry</h3>
        <p className="mt-1.5 text-xs text-slate-500">{OPERATOR_AGENTS.length} canonical agents with purpose, capabilities, providers, routing strategy, and status.</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {agents.map((agent) => (
            <article key={agent.id} className="rounded-xl border border-slate-700/40 bg-slate-800/50 p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-200">{agent.name}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{agent.purpose}</p>
                </div>
                <span className={[
                  'rounded-full border px-2 py-0.5 text-[10px] font-bold',
                  agent.status === 'active' ? 'border-emerald-500/20 bg-emerald-500/8 text-emerald-400' : 'border-slate-700/40 bg-slate-800/40 text-slate-500',
                ].join(' ')}>{agent.status}</span>
              </div>
              <p className="mt-2 text-[10px] font-semibold text-slate-600">Capabilities: {agent.allowedCapabilities.join(', ')}</p>
              <p className="mt-0.5 text-[10px] font-semibold text-slate-600">Route: {agent.executionRoute ? `${agent.executionRoute.provider}/${agent.executionRoute.model}` : agent.unavailableReason}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function AgentDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-700/40 bg-slate-800/40 p-2.5">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">{label}</p>
      <p className="mt-0.5 truncate text-xs font-bold text-slate-300">{value}</p>
    </div>
  )
}
