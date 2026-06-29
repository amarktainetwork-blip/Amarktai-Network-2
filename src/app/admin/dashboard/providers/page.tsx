import { getProviderRuntimeTruth } from '@/lib/provider-runtime-truth'

export const dynamic = 'force-dynamic'

export default async function ProvidersPage() {
  const providers = await getProviderRuntimeTruth().catch(() => [])

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-[#071019] p-6">
        <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Admin</p>
        <h1 className="mt-2 text-2xl font-black text-white">Providers &amp; Models</h1>
        <p className="mt-1 text-sm text-slate-400">Provider configuration, connection status, and endpoint health. No override controls — runtime routes automatically.</p>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
        <h2 className="font-black text-white">Provider status</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">
                <th className="pb-3 pr-4">Provider</th>
                <th className="pb-3 pr-4">Has key</th>
                <th className="pb-3 pr-4">Key source</th>
                <th className="pb-3 pr-4">Endpoint</th>
                <th className="pb-3 pr-4">Last test</th>
                <th className="pb-3 pr-4">Connected</th>
                <th className="pb-3">Blocker</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {providers.map((p) => (
                <tr key={p.providerId} className="text-slate-300">
                  <td className="py-3 pr-4 font-black">{p.displayName}</td>
                  <td className="py-3 pr-4">
                    <StatusPill ok={p.hasKey} trueLabel="Yes" falseLabel="No" />
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-slate-500">{p.keySource}</td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${p.endpointStatus === 'ok' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : p.endpointStatus === 'not_required' ? 'border-slate-700 bg-slate-900 text-slate-500' : 'border-amber-400/30 bg-amber-400/10 text-amber-300'}`}>
                      {p.endpointStatus}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${p.lastTestStatus === 'passed' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : p.lastTestStatus === 'failed' ? 'border-red-400/30 bg-red-400/10 text-red-300' : 'border-slate-700 bg-slate-900 text-slate-500'}`}>
                      {p.lastTestStatus ?? 'not_tested'}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <StatusPill ok={p.connected} trueLabel="Connected" falseLabel="Not connected" />
                  </td>
                  <td className="py-3 max-w-xs text-xs text-slate-500 truncate">{p.blocker || '—'}</td>
                </tr>
              ))}
              {providers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-slate-500">
                    No provider data. Check Settings to configure providers.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
        <h2 className="font-black text-white">Note</h2>
        <p className="mt-2 text-sm text-slate-400">Provider and model overrides are not available here. AmarktAI Network selects providers automatically based on capability, cost tier, and proof status. To run live tests or change keys, go to <a href="/admin/dashboard/settings" className="text-cyan-400 underline">Settings</a>.</p>
      </section>
    </div>
  )
}

function StatusPill({ ok, trueLabel, falseLabel }: { ok: boolean; trueLabel: string; falseLabel: string }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${ok ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-slate-700 bg-slate-900 text-slate-500'}`}>
      {ok ? trueLabel : falseLabel}
    </span>
  )
}
