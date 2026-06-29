import { getProviderRuntimeTruth } from '@/lib/provider-runtime-truth'

export const dynamic = 'force-dynamic'

export default async function ProofPage() {
  const providers = await getProviderRuntimeTruth().catch(() => [])

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-[#071019] p-6">
        <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Admin</p>
        <h1 className="mt-2 text-2xl font-black text-white">Proof &amp; Tests</h1>
        <p className="mt-1 text-sm text-slate-400">
          Provider proof records, last test results, and capability proof status.
          Run tests in <a href="/admin/dashboard/settings" className="text-cyan-400 underline">Settings</a>.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
        <h2 className="font-black text-white">Provider proof records</h2>
        <div className="mt-4 space-y-2">
          {providers.map((p) => (
            <div key={p.providerId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/55 px-4 py-3">
              <div>
                <p className="font-black text-slate-200">{p.displayName}</p>
                <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                  {p.lastTestedAt ? `Last tested: ${new Date(p.lastTestedAt).toLocaleString()}` : 'Never tested'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                  p.lastTestStatus === 'passed' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' :
                  p.lastTestStatus === 'failed' ? 'border-red-400/30 bg-red-400/10 text-red-300' :
                  'border-slate-700 bg-slate-900 text-slate-500'
                }`}>
                  {p.lastTestStatus === 'passed' ? 'Proven' :
                   p.lastTestStatus === 'failed' ? 'Failed' :
                   'Not tested'}
                </span>
                {!p.connected && (
                  <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-black text-slate-500">
                    Not connected
                  </span>
                )}
              </div>
              {p.blocker && (
                <p className="w-full text-xs text-red-300">{p.blocker}</p>
              )}
            </div>
          ))}
          {providers.length === 0 && (
            <p className="py-4 text-sm text-slate-500">No provider proof data. Configure providers in Settings.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
        <h2 className="font-black text-white">Run tests</h2>
        <p className="mt-2 text-sm text-slate-400">
          Live provider tests are only available in <a href="/admin/dashboard/settings" className="text-cyan-400 underline">Settings → Provider Tests</a>.
          This page shows proof records only.
        </p>
      </section>
    </div>
  )
}
