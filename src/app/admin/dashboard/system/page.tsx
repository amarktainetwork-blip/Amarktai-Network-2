import { getVpsSnapshot } from '@/lib/vps-monitor'
import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'

export default async function SystemPage() {
  const [vps, runtime] = await Promise.all([getVpsSnapshot().catch(() => null), getDashboardRuntimeTruth().catch(() => null)])
  const serviceRows = vps ? Object.entries(vps.services) : []
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-cyan-400/20 bg-slate-900/70 p-6"><p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">System · Admin only</p><h1 className="mt-2 text-3xl font-black text-white">VPS, services, queues, storage, and runtime truth.</h1><p className="mt-2 text-sm leading-6 text-slate-400">All checks are read-only. Destructive repairs, restarts, merges, and deployments remain approval-gated.</p></section>
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Metric label="Host" value={vps?.host.hostname || 'Unknown'} /><Metric label="Memory used" value={vps ? `${vps.host.memory.usedPercent}%` : 'Unknown'} /><Metric label="Uptime" value={vps ? `${Math.floor(vps.host.uptimeSeconds / 3600)} hours` : 'Unknown'} /><Metric label="Queue" value={vps?.queue.healthy ? 'Ready' : 'Needs attention'} /></section>
      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="Services">{serviceRows.map(([name, value]) => <Row key={name} label={name} value={formatService(value)} />)}</Panel>
        <Panel title="Runtime truth">{(runtime?.providers ?? []).slice(0, 14).map((provider) => <Row key={provider.key} label={provider.displayName} value={provider.configured ? provider.status : 'Needs setup'} />)}</Panel>
      </section>
      <details className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5"><summary className="cursor-pointer text-sm font-black text-slate-300">Advanced diagnostics</summary><pre className="mt-4 max-h-[520px] overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-500">{JSON.stringify({ vps, runtime }, null, 2)}</pre></details>
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
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-2 text-xl font-black text-white">{value}</p></div> }
function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5"><h2 className="font-black text-white">{title}</h2><div className="mt-4 space-y-2">{children}</div></section> }
function Row({ label, value }: { label: string; value: string }) { return <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-2 text-xs last:border-0"><span className="font-bold text-slate-500">{label}</span><span className="max-w-[65%] text-right font-bold text-slate-300">{value}</span></div> }
