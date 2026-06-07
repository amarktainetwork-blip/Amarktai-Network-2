import { getVpsSnapshot } from '@/lib/vps-monitor'
import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'

export default async function SystemPage() {
  const [vps, runtime] = await Promise.all([getVpsSnapshot().catch(() => null), getDashboardRuntimeTruth().catch(() => null)])
  const serviceRows = vps ? Object.entries(vps.services) : []
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-cyan-400/20 bg-slate-900/70 p-6">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Advanced Admin</p>
        <h1 className="mt-2 text-3xl font-black text-white">System, operations, VPS, queues, logs, and runtime diagnostics.</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Technical detail stays here, outside the normal product workflow. Destructive repairs, restarts, merges, and deployments remain approval-gated.</p>
      </section>
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Host" value={vps?.host.hostname || 'Unknown'} />
        <Metric label="Memory used" value={vps ? `${vps.host.memory.usedPercent}%` : 'Unknown'} />
        <Metric label="Uptime" value={vps ? `${Math.floor(vps.host.uptimeSeconds / 3600)} hours` : 'Unknown'} />
        <Metric label="Queue" value={vps?.queue.healthy ? 'Ready' : 'Needs attention'} />
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="Services">{serviceRows.map(([name, value]) => <Row key={name} label={name} value={formatService(value)} />)}</Panel>
        <Panel title="Runtime truth">{(runtime?.providers ?? []).slice(0, 14).map((provider) => <Row key={provider.key} label={provider.displayName} value={provider.connected ? 'Connected' : provider.reason} />)}</Panel>
      </section>
      <details className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5">
        <summary className="cursor-pointer text-sm font-black text-slate-300">Raw diagnostics</summary>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {(runtime?.blockers ?? []).map((blocker) => <Row key={blocker} label="Action" value={blocker} />)}
          {!runtime?.blockers?.length && <p className="text-sm text-slate-400">No runtime blockers reported.</p>}
        </div>
      </details>
    </div>
  )
}

function formatService(value: unknown) {
  if (!value) return 'Unknown'
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value && 'available' in value) return (value as { available: boolean; output?: string }).available ? ((value as { output?: string }).output || 'Available').split('\n')[0] : 'Needs attention'
  if (typeof value === 'object' && value && 'status' in value) return String((value as { status?: unknown }).status)
  return 'Checked'
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-2 text-xl font-black text-white">{value}</p></div>
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5"><h2 className="font-black text-white">{title}</h2><div className="mt-4 space-y-2">{children}</div></section>
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-2 text-xs last:border-0"><span className="font-bold text-slate-500">{label}</span><span className="max-w-[65%] text-right font-bold text-slate-300">{value}</span></div>
}
