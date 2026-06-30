import { getProviderRuntimeTruth } from '@/lib/provider-runtime-truth'
import {
  ACTIVE_DASHBOARD_PROVIDER_IDS,
  FUTURE_DASHBOARD_PROVIDER_IDS,
  PROVIDER_MODEL_SURFACE,
} from '@/lib/dashboard-control-room'

export const dynamic = 'force-dynamic'

export default async function ProvidersPage() {
  const providers = await getProviderRuntimeTruth().catch(() => [])
  const providerById = new Map(providers.map((provider) => [provider.providerId, provider]))
  const activeProviders = PROVIDER_MODEL_SURFACE.filter((provider) => provider.runtimeStatus === 'active_v1')
  const futureProviders = PROVIDER_MODEL_SURFACE.filter((provider) => provider.runtimeStatus === 'future_workbench')
  const visibleProviderIds = new Set<string>([
    ...ACTIVE_DASHBOARD_PROVIDER_IDS,
    ...FUTURE_DASHBOARD_PROVIDER_IDS,
  ])

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-[#071019] p-6">
        <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Admin</p>
        <h1 className="mt-2 text-2xl font-black text-white">Providers &amp; Models</h1>
        <p className="mt-1 max-w-4xl text-sm leading-7 text-slate-400">
          Active V1 runtime providers are GenX, Together, and Groq. MiMo is preserved as future/workbench only. Provider/model overrides are not exposed to app requests.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {activeProviders.map((surface) => (
          <ProviderCard key={surface.providerId} surface={surface} runtime={providerById.get(surface.providerId)} />
        ))}
      </section>

      <section className="rounded-2xl border border-blue-300/15 bg-blue-300/8 p-5">
        <h2 className="font-black text-blue-100">Future/workbench only</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {futureProviders.map((surface) => (
            <ProviderCard key={surface.providerId} surface={surface} runtime={providerById.get(surface.providerId)} future />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
        <h2 className="font-black text-white">Provider status from runtime truth</h2>
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
              {providers.filter((provider) => visibleProviderIds.has(provider.providerId)).map((p) => (
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
                  <td className="max-w-xs truncate py-3 text-xs text-slate-500">{p.blocker || 'None'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
        <h2 className="font-black text-white">Runtime rule</h2>
        <p className="mt-2 text-sm text-slate-400">
          Apps send capability requests. The runtime selects providers and models internally, then returns selected provider/model in proof output after execution.
        </p>
      </section>
    </div>
  )
}

function ProviderCard({
  surface,
  runtime,
  future = false,
}: {
  surface: (typeof PROVIDER_MODEL_SURFACE)[number]
  runtime?: Awaited<ReturnType<typeof getProviderRuntimeTruth>>[number]
  future?: boolean
}) {
  return (
    <article className={`rounded-2xl border p-5 ${future ? 'border-blue-300/20 bg-blue-300/8' : 'border-slate-800 bg-slate-900/55'}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-white">{surface.displayName}</h2>
          <p className="mt-1 text-xs font-black uppercase tracking-wide text-slate-500">
            {surface.runtimeStatus === 'active_v1' ? 'Active V1 runtime' : 'Future/workbench only'}
          </p>
        </div>
        <StatusPill
          ok={future ? false : Boolean(runtime?.connected)}
          trueLabel="Working"
          falseLabel={future ? 'Future' : runtime?.configured ? 'Configured' : 'Missing'}
        />
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-400">{surface.role}</p>
      <div className="mt-4 space-y-3">
        <ChipGroup label="Supported capabilities" values={surface.supportedCapabilities} />
        <ChipGroup label="Model families" values={surface.modelFamilies} />
      </div>
      <p className="mt-4 rounded-xl border border-slate-800 bg-slate-950/55 p-3 text-xs leading-5 text-slate-400">
        {runtime?.blocker || surface.blocker}
      </p>
    </article>
  )
}

function ChipGroup({ label, values }: { label: string; values: readonly string[] }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {values.map((value) => (
          <span key={value} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] font-bold text-slate-300">
            {value}
          </span>
        ))}
      </div>
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
