const apps = [
  { name: 'AmarktAI Network', repo: 'amarktainetwork-blip/Amarktai-Network-2', route: 'Dashboard and Workbench' },
  { name: 'Connected app', repo: 'Select in Workbench', route: 'Use app-level model routing' },
]

export default function AppsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Apps</p>
        <h1 className="mt-3 text-3xl font-black text-white">Apps connect to the Repo Workbench.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          Each app can be routed through the approved model catalog and improved through the same repo, branch, prompt, patch, checks, and PR workflow.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {apps.map((app) => (
          <div key={app.name} className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
            <p className="text-lg font-bold text-white">{app.name}</p>
            <p className="mt-2 text-sm text-slate-400">{app.repo}</p>
            <p className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-300">{app.route}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
