const systemItems = [
  { name: 'GitHub', type: 'Source control key and PR operations' },
  { name: 'Webdock', type: 'VPS and system monitoring' },
  { name: 'Storage', type: 'Artifacts, logs, and generated reports' },
  { name: 'Workbench checks', type: 'lint, tests, build, and approved commands' },
]

export default function SystemPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">System</p>
        <h1 className="mt-3 text-3xl font-black text-white">Runtime services for the Workbench.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          System tools support repository operations and monitoring. They are not listed as AI providers.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        {systemItems.map((item) => (
          <div key={item.name} className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
            <p className="text-base font-bold text-white">{item.name}</p>
            <p className="mt-3 text-sm leading-6 text-slate-400">{item.type}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
