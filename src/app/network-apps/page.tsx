import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import PublicShell from '@/components/public/PublicShell'
import { NETWORK_APPS } from '@/lib/product-contract'

export default function PublicNetworkAppsPage() {
  return (
    <PublicShell>
      <section className="architecture-band py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">Network Apps</p>
          <h1 className="mt-5 max-w-5xl text-4xl font-black leading-tight text-white sm:text-5xl lg:text-7xl">Connected business modules with honest readiness.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">Each module has a clear purpose and an explicit status. Planned work is never presented as live.</p>
        </div>
      </section>
      <section className="bg-[var(--amarkt-obsidian)] py-20">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 md:grid-cols-2 lg:px-8">
          {NETWORK_APPS.map((app) => (
            <article key={app.slug} className="premium-panel rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-white">{app.displayName}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{app.purpose}</p>
                </div>
                <Status value={app.status} />
              </div>
              <Link href="/admin/login" className="mt-6 inline-flex items-center gap-2 text-sm font-black text-cyan-200">Open private access <ArrowRight className="h-4 w-4" /></Link>
            </article>
          ))}
        </div>
      </section>
    </PublicShell>
  )
}

function Status({ value }: { value: string }) {
  const style = value === 'Live'
    ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200'
    : value === 'In build'
      ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100'
      : value === 'Needs setup' || value === 'Blocked'
        ? 'border-amber-300/30 bg-amber-300/10 text-amber-100'
        : 'border-white/15 bg-white/5 text-slate-200'
  return <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-black ${style}`}>{value === 'Blocked' ? 'Needs setup' : value}</span>
}
