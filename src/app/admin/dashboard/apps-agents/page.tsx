import { OPERATOR_AGENTS, listOperatorAgents } from '@/lib/agent-registry'
import { listAppAiPackages } from '@/lib/app-ai-package-store'
import { EXTERNAL_APP_ONBOARDING_LABEL, ROOT_WORKSPACE } from '@/lib/provider-capability-governance'

const appFields = [
  'name', 'slug', 'domain/subdomain', 'repo', 'VPS path', 'service name',
  'health endpoint', 'app type', 'assigned agents', 'assigned model package',
  'memory namespace', 'storage namespace', 'adult policy', 'deployment profile', 'status',
]

const appTypes = ['companion/chat', 'marketing', 'coding/dev', 'research', 'media/avatar', 'operations', 'custom']

type AgentSummary = ReturnType<typeof listOperatorAgents>[number]

export default async function AppsAgentsPage() {
  const [packages, agents] = await Promise.all([
    listAppAiPackages().catch(() => []),
    Promise.resolve(listOperatorAgents(ROOT_WORKSPACE.appSlug)),
  ])
  const availableAgents = agents.filter((agent) => agent.status === 'available')
  const unavailableAgents = agents.filter((agent) => agent.status !== 'available')
  const groupedAgents = groupAgents(availableAgents)

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl lg:p-7">
        <div className="pointer-events-none absolute right-0 top-0 h-48 w-72 rounded-bl-[6rem] bg-gradient-to-br from-violet-500/8 via-cyan-500/5 to-transparent blur-3xl" />
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-400/80">Apps & Agents</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-100 lg:text-3xl">Root workspace active.</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          {ROOT_WORKSPACE.message} External app onboarding is separate and optional.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {['Root workspace active', 'Full configured access', 'Internal agents grouped', 'External apps optional'].map((item) => (
            <span key={item} className="rounded-full border border-slate-700/50 bg-slate-800/50 px-2.5 py-1 text-[10px] font-bold text-slate-400">{item}</span>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl">
        <h3 className="text-sm font-black text-slate-200">Agent registry</h3>
        <p className="mt-1.5 text-xs text-slate-500">
          Root workspace active. {OPERATOR_AGENTS.length} internal agents are grouped by the work they unlock.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {Object.entries(groupedAgents).map(([group, groupAgents]) => (
            <div key={group} className="rounded-xl border border-slate-700/40 bg-slate-950/40 p-3">
              <p className="text-xs font-black text-slate-300">{group}</p>
              <div className="mt-3 grid gap-2">
                {groupAgents.map((agent) => <AgentCard key={agent.id} agent={agent} />)}
                {!groupAgents.length && <p className="text-xs font-semibold text-slate-600">No active agent in this group yet.</p>}
              </div>
            </div>
          ))}
        </div>
        <details className="mt-4 rounded-xl border border-slate-700/40 bg-slate-950/40 p-3">
          <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.14em] text-slate-500">Not available yet</summary>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {unavailableAgents.map((agent) => <AgentCard key={agent.id} agent={agent} />)}
            {!unavailableAgents.length && <p className="text-xs font-semibold text-slate-600">No unavailable agents reported.</p>}
          </div>
        </details>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <details className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl">
          <summary className="cursor-pointer text-sm font-black text-slate-200">{EXTERNAL_APP_ONBOARDING_LABEL}</summary>
          <h3 className="text-sm font-black text-slate-200">External managed app package schema</h3>
          <p className="mt-2 text-xs leading-5 text-slate-500">Use this only for future apps managed by AmarktAI Network. The root workspace does not need onboarding.</p>
          <div className="mt-4 grid gap-1.5 sm:grid-cols-2">
            {appFields.map((field) => (
              <div key={field} className="rounded-lg border border-slate-700/40 bg-slate-800/40 px-2.5 py-1.5 text-xs font-semibold text-slate-400">{field}</div>
            ))}
          </div>
          <h4 className="mt-5 text-xs font-black text-slate-300">App types</h4>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {appTypes.map((type) => <span key={type} className="rounded-full border border-cyan-500/20 bg-cyan-500/8 px-2.5 py-1 text-xs font-bold text-cyan-400">{type}</span>)}
          </div>
        </details>

        <div className="space-y-3">
          {packages.map((pkg) => (
            <article key={pkg.appSlug} className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4 backdrop-blur-xl">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-black text-slate-100">{pkg.appName}</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">{pkg.appSlug} / {(pkg as { domain?: string }).domain || 'domain needed'} / {pkg.appType}</p>
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
              <p className="font-black text-slate-300">No external managed app packages saved yet.</p>
              <p className="mt-1.5 text-sm text-slate-500">Package store available. Assignment UI wiring pending; no placeholder data shown.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function groupAgents(agents: AgentSummary[]) {
  const groups: Record<string, AgentSummary[]> = {
    'Build & Code': [],
    Research: [],
    'Creative Media': [],
    Operations: [],
    Safety: [],
    Memory: [],
  }
  for (const agent of agents) {
    const text = `${agent.name} ${agent.purpose} ${agent.allowedCapabilities.join(' ')}`.toLowerCase()
    if (text.includes('code') || text.includes('repo') || text.includes('deploy')) groups['Build & Code'].push(agent)
    else if (text.includes('research') || text.includes('scrap') || text.includes('crawl')) groups.Research.push(agent)
    else if (text.includes('image') || text.includes('video') || text.includes('audio') || text.includes('voice') || text.includes('creative')) groups['Creative Media'].push(agent)
    else if (text.includes('safe') || text.includes('policy') || text.includes('moderation')) groups.Safety.push(agent)
    else if (text.includes('memory') || text.includes('learn')) groups.Memory.push(agent)
    else groups.Operations.push(agent)
  }
  return groups
}

function AgentCard({ agent }: { agent: AgentSummary }) {
  return (
    <article className="rounded-xl border border-slate-700/40 bg-slate-800/50 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-200">{agent.name}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{agent.purpose}</p>
        </div>
        <span className={[
          'rounded-full border px-2 py-0.5 text-[10px] font-bold',
          agent.status === 'available' ? 'border-emerald-500/20 bg-emerald-500/8 text-emerald-400' : 'border-amber-500/20 bg-amber-500/8 text-amber-400',
        ].join(' ')}>{agent.status}</span>
      </div>
      <p className="mt-2 text-[10px] font-semibold text-slate-600">Capabilities: {agent.allowedCapabilities.join(', ')}</p>
      <p className="mt-0.5 text-[10px] font-semibold text-slate-600">Route: {agent.executionRoute ? `${agent.executionRoute.provider}/${agent.executionRoute.model}` : agent.unavailableReason}</p>
    </article>
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
