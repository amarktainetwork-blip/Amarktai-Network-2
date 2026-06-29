import { PLATFORM_LIBRARIES } from '@/lib/platform-library-registry'

export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, string> = {
  planned: 'border-slate-700 bg-slate-900 text-slate-500',
  installed: 'border-blue-400/30 bg-blue-400/10 text-blue-300',
  wired: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300',
  proven: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  blocked: 'border-red-400/30 bg-red-400/10 text-red-300',
}

const STATUS_LABELS: Record<string, string> = {
  planned: 'Planned',
  installed: 'Installed',
  wired: 'Wired',
  proven: 'Proven',
  blocked: 'Blocked',
}

export default function LibrariesPage() {
  const installed = PLATFORM_LIBRARIES.filter((l) => l.status !== 'planned')
  const planned = PLATFORM_LIBRARIES.filter((l) => l.status === 'planned')

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-[#071019] p-6">
        <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Admin</p>
        <h1 className="mt-2 text-2xl font-black text-white">Libraries &amp; Integrations</h1>
        <p className="mt-1 text-sm text-slate-400">
          Platform library registry. Status determined from package.json and real code evidence only.
          {' '}{installed.length} installed · {planned.length} planned
        </p>
      </section>

      {installed.length > 0 && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
          <h2 className="font-black text-white">Installed / wired / proven</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">
                  <th className="pb-3 pr-4">Library</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Purpose</th>
                  <th className="pb-3 pr-4">Used by</th>
                  <th className="pb-3">Next action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {installed.map((lib) => (
                  <tr key={lib.id}>
                    <td className="py-3 pr-4">
                      <p className="font-black text-slate-200">{lib.name}</p>
                      {lib.installedPackageName && <p className="font-mono text-[10px] text-slate-600">{lib.installedPackageName}</p>}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${STATUS_STYLES[lib.status] ?? STATUS_STYLES.planned}`}>
                        {STATUS_LABELS[lib.status] ?? lib.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 max-w-xs text-xs text-slate-400">{lib.purpose}</td>
                    <td className="py-3 pr-4 text-xs text-slate-500">{lib.usedByCapabilities.join(', ')}</td>
                    <td className="py-3 text-xs text-slate-400">{lib.nextAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
        <h2 className="font-black text-white">Planned</h2>
        <p className="mt-1 text-xs text-slate-500">Not yet in package.json. Do not install packages in this prompt.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {planned.map((lib) => (
            <div key={lib.id} className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-black text-slate-300">{lib.name}</p>
                  {lib.installedPackageName && <p className="font-mono text-[10px] text-slate-600">{lib.installedPackageName}</p>}
                </div>
                <span className="shrink-0 rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-black text-slate-500">Planned</span>
              </div>
              <p className="mt-2 text-xs text-slate-500 leading-5">{lib.purpose}</p>
              <p className="mt-2 text-xs text-cyan-500">{lib.nextAction}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
