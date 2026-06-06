import { NETWORK_APPS_EMPTY_MESSAGE } from '@/lib/network-apps-registry'

export default function NetworkAppsPage() {
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-700/50 bg-slate-900/70 p-6">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Network Apps</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">No connected apps</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">{NETWORK_APPS_EMPTY_MESSAGE}</p>
      </section>
    </div>
  )
}
