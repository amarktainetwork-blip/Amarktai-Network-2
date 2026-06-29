import { getProviderRuntimeTruth } from '@/lib/provider-runtime-truth'
import { runCoreCapabilityProofPack } from '@/lib/core-capability-proof-runner'

export const dynamic = 'force-dynamic'

export default async function ProofPage() {
  const [providers, coreProof] = await Promise.all([
    getProviderRuntimeTruth().catch(() => []),
    runCoreCapabilityProofPack().catch(() => null),
  ])

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

      {coreProof && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-black text-white">Core Launch Proof</h2>
              <p className="mt-1 text-sm text-slate-400">Live proof contract for launch Studio/runtime capabilities.</p>
              <p className="mt-2 text-xs leading-6 text-slate-500">
                The HTTP proof route is admin protected. VPS terminal proof uses <span className="font-mono text-slate-300">npm run proof</span>, which reuses the same core proof runner and does not bypass HTTP auth.
              </p>
            </div>
            <a href="/api/admin/proof/core" className="text-sm font-bold text-cyan-300 underline">Open JSON</a>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-3 py-2">Capability</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Provider</th>
                  <th className="px-3 py-2">Model</th>
                  <th className="px-3 py-2">Artifact</th>
                  <th className="px-3 py-2">Job / Poll</th>
                  <th className="px-3 py-2">Blocker</th>
                  <th className="px-3 py-2">Next action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {coreProof.capabilities.map((capability) => (
                  <tr key={capability.capability}>
                    <td className="px-3 py-3 font-black text-slate-200">{capability.capability}</td>
                    <td className="px-3 py-3 font-bold text-slate-300">{capability.status}</td>
                    <td className="px-3 py-3 text-slate-400">{capability.provider ?? 'None yet'}</td>
                    <td className="px-3 py-3 text-slate-400">{capability.model ?? 'None yet'}</td>
                    <td className="px-3 py-3 text-slate-400">{capability.artifactId ?? capability.storageUrl ?? 'None yet'}</td>
                    <td className="px-3 py-3 text-slate-400">{capability.jobId ?? capability.pollUrl ?? 'None'}</td>
                    <td className="max-w-xs px-3 py-3 text-slate-400">{capability.blocker ?? 'None'}</td>
                    <td className="max-w-xs px-3 py-3 text-slate-400">{capability.nextAction ?? 'No action required'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

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
