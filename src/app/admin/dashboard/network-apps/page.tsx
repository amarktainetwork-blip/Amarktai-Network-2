import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { NETWORK_APPS } from '@/lib/network-apps-registry'

export default function NetworkAppsPage() {
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-cyan-400/20 bg-slate-900/70 p-6">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Network Apps</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Business modules that share memory, events, and outcomes.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">Statuses are explicit. Planned modules are not presented as live, and every app shows what it needs next.</p>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        {NETWORK_APPS.map((app) => (
          <article key={app.slug} className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5">
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="text-lg font-black text-white">{app.displayName}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{app.purpose}</p></div>
              <Status value={app.status} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">{app.capabilities.map((capability) => <span key={capability} className="rounded-full border border-slate-700 px-2.5 py-1 text-xs font-bold text-slate-400">{capability}</span>)}</div>
            <Link href={app.openHref} className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-cyan-300">Open in Command <ArrowRight className="h-4 w-4" /></Link>
          </article>
        ))}
      </section>
    </div>
  )
}

function Status({ value }: { value: string }) {
  const classes = value === 'Ready' ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : value === 'In build' ? 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300' : 'border-slate-600 bg-slate-800 text-slate-300'
  return <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-black ${classes}`}>{value}</span>
}
