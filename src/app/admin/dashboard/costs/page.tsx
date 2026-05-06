const modes = [
  { name: 'cheap', description: 'Fast, low-cost routes for small fixes, summaries, and first-pass plans.' },
  { name: 'balanced', description: 'Default route for everyday patches, reviews, and app improvements.' },
  { name: 'premium', description: 'Highest quality route for complex repo changes and risky releases.' },
]

export default function CostsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Costs</p>
        <h1 className="mt-3 text-3xl font-black text-white">Simple cost modes for model routing.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          Workbench prompts use cheap, balanced, or premium routing so app-level model selection can evolve without adding provider clutter to the main flow.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {modes.map((mode) => (
          <div key={mode.name} className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
            <p className="text-lg font-black capitalize text-white">{mode.name}</p>
            <p className="mt-3 text-sm leading-6 text-slate-400">{mode.description}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
