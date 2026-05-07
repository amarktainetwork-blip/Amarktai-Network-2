import { OPERATOR_AGENTS, listOperatorAgents } from '@/lib/agent-registry'
import { listAppAiPackages } from '@/lib/app-ai-package-store'
import { ADULT_POLICY_VALUES } from '@/lib/universal-model-catalog'

const appFields = [
  'name',
  'slug',
  'domain/subdomain',
  'repo',
  'VPS path',
  'service name',
  'health endpoint',
  'app type',
  'assigned agents',
  'assigned model package',
  'memory namespace',
  'storage namespace',
  'adult policy',
  'deployment profile',
  'status',
]

const appTypes = ['companion/chat', 'marketing', 'coding/dev', 'research', 'media/avatar', 'operations', 'custom']

export default async function AppsAgentsPage() {
  const [packages, agents] = await Promise.all([
    listAppAiPackages().catch(() => []),
    Promise.resolve(listOperatorAgents('superbrain')),
  ])

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-[0_24px_100px_rgba(15,23,42,0.12)] backdrop-blur-2xl lg:p-8">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-700">Apps & Agents</p>
        <h2 className="mt-3 max-w-4xl text-4xl font-black tracking-tight text-slate-950 lg:text-5xl">Connected app orchestration.</h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
          Apps run from this VPS and its subdomains. The Superbrain assigns model packages, agents, memory namespaces, storage namespaces, adult policy, deployment profiles, and operational status.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {['Registry available', 'Create/edit UI pending', 'Assignment UI pending', 'Backend package store available'].map((status) => (
            <span key={status} className="rounded-full border border-slate-200 bg-white/75 px-3 py-1.5 text-xs font-black text-slate-700">{status}</span>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-white/70 bg-white/65 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl">
          <h3 className="text-xl font-black text-slate-950">App package shape</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">The app registry uses one VPS-aware structure instead of implying separate infrastructure per app.</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {appFields.map((field) => (
              <div key={field} className="rounded-2xl border border-slate-200 bg-white/75 px-3 py-2 text-xs font-bold text-slate-600">{field}</div>
            ))}
          </div>
          <h4 className="mt-6 text-sm font-black text-slate-900">App types</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {appTypes.map((type) => <span key={type} className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-bold text-white">{type}</span>)}
          </div>
          <h4 className="mt-6 text-sm font-black text-slate-900">Adult policy values</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {ADULT_POLICY_VALUES.map((policy) => <span key={policy} className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-800">{policy}</span>)}
          </div>
        </div>

        <div className="space-y-4">
          {packages.map((pkg) => (
            <article key={pkg.appSlug} className="rounded-3xl border border-white/70 bg-white/65 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xl font-black text-slate-950">{pkg.appName}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{pkg.appSlug} - {pkg.domain || 'domain needed'} - {pkg.appType}</p>
                </div>
                <span className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-bold text-white">{pkg.modelStrategy ?? pkg.budget?.mode ?? 'balanced'}</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Detail label="Repo" value={(pkg as { repo?: string }).repo ?? 'Configured in Workbench'} />
                <Detail label="VPS path" value={(pkg as { vpsPath?: string }).vpsPath ?? '/var/www/amarktai/apps'} />
                <Detail label="Service" value={(pkg as { serviceName?: string }).serviceName ?? `${pkg.appSlug}.service`} />
                <Detail label="Memory" value={(pkg as { memoryNamespace?: string }).memoryNamespace ?? `app:${pkg.appSlug}`} />
                <Detail label="Storage" value={(pkg as { storageNamespace?: string }).storageNamespace ?? `apps/${pkg.appSlug}`} />
                <Detail label="Adult policy" value={pkg.adultPolicy ?? 'off'} />
              </div>
            </article>
          ))}
          {!packages.length && (
            <div className="rounded-3xl border border-white/70 bg-white/65 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl">
              <p className="text-lg font-black text-slate-950">No app packages saved yet.</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Backend package store available. Create/edit and assignment UI wiring is pending, so this page does not show unsaved sample apps as real records.</p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-white/70 bg-white/65 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="text-xl font-black text-slate-950">Agent registry</h3>
            <p className="mt-2 text-sm text-slate-600">{OPERATOR_AGENTS.length} canonical agents with purpose, capabilities, providers, routing strategy, scope, approvals, and route status.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {agents.map((agent) => (
            <article key={agent.id} className="rounded-2xl border border-slate-200 bg-white/75 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-slate-950">{agent.name}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{agent.purpose}</p>
                </div>
                <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-800">{agent.status}</span>
              </div>
              <p className="mt-3 text-xs font-semibold text-slate-500">Capabilities: {agent.allowedCapabilities.join(', ')}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Route: {agent.executionRoute ? `${agent.executionRoute.provider}/${agent.executionRoute.model}` : agent.unavailableReason}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/75 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 truncate text-xs font-bold text-slate-700">{value}</p>
    </div>
  )
}
