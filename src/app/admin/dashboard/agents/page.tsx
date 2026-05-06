import { listOperatorAgents } from '@/lib/agent-registry'

export default function AgentsPage() {
  const agents = listOperatorAgents()

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Agents</p>
        <h1 className="mt-3 text-3xl font-black text-white">Operator agents.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          Agents are defined by purpose, allowed capabilities, model strategy, cost mode, app scope, approvals, and the current execution route.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {agents.map((agent) => (
          <article key={agent.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-white">{agent.name}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">{agent.purpose}</p>
              </div>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">{agent.status}</span>
            </div>
            <dl className="mt-4 grid gap-3 text-xs text-slate-400 md:grid-cols-2">
              <div><dt className="text-slate-500">Capabilities</dt><dd className="mt-1 text-slate-300">{agent.allowedCapabilities.join(', ')}</dd></div>
              <div><dt className="text-slate-500">Strategy</dt><dd className="mt-1 text-slate-300">{agent.defaultModelStrategy} / {agent.costMode}</dd></div>
              <div><dt className="text-slate-500">App scope</dt><dd className="mt-1 text-slate-300">{agent.appScope}</dd></div>
              <div><dt className="text-slate-500">Approvals</dt><dd className="mt-1 text-slate-300">{agent.approvalRequirements.join(', ')}</dd></div>
            </dl>
            <p className="mt-4 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs leading-5 text-slate-400">
              {agent.executionRoute
                ? `${agent.executionRoute.provider} / ${agent.executionRoute.model}: ${agent.executionRoute.reason}`
                : agent.unavailableReason}
            </p>
          </article>
        ))}
      </section>
    </div>
  )
}
