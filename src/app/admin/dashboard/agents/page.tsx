const agents = [
  { name: 'Planner', purpose: 'Turns a prompt into a concise implementation plan.' },
  { name: 'Patch Builder', purpose: 'Creates focused diffs for the selected repository and branch.' },
  { name: 'Check Runner', purpose: 'Runs lint, tests, and build commands through approved workbench checks.' },
  { name: 'Release Operator', purpose: 'Creates PRs and handles merge or deploy actions when enabled.' },
]

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Agents</p>
        <h1 className="mt-3 text-3xl font-black text-white">Agents serve the Workbench flow.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          Agent roles are kept simple and tied to product actions users can approve, inspect, and verify.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        {agents.map((agent) => (
          <div key={agent.name} className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
            <p className="text-base font-bold text-white">{agent.name}</p>
            <p className="mt-3 text-sm leading-6 text-slate-400">{agent.purpose}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
