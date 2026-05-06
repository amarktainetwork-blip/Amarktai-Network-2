const approvals = [
  'Apply patch',
  'Run checks',
  'Create PR',
  'Merge',
  'Deploy',
]

export default function ActionsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Actions</p>
        <h1 className="mt-3 text-3xl font-black text-white">Human-approved Workbench actions.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          Repository writes, Git operations, merge, and deploy actions are explicit product controls. The Workbench shows each result in an output tab.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {approvals.map((approval) => (
          <div key={approval} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-bold text-white">{approval}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">Requires an operator click in the Workbench.</p>
          </div>
        ))}
      </section>
    </div>
  )
}
