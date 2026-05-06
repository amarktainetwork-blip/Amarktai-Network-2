import { getResearchToolStatus } from '@/lib/research-tools'
import { getSystemRuntimeStatus } from '@/lib/system-runtime-status'

export default async function SystemPage() {
  const [system, research] = await Promise.all([
    getSystemRuntimeStatus(),
    getResearchToolStatus(),
  ])

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">System</p>
        <h1 className="mt-3 text-3xl font-black text-white">System and VPS status.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          GitHub, Webdock, storage, service checks, and research tools live here. AI providers stay in the model catalog.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <StatusCard name="Webdock" status={system.vps.status} detail="VPS monitoring" />
        <StatusCard name="Storage" status={system.storage.status} detail={system.workspaceRoot} />
        {system.services.map((service) => (
          <StatusCard key={service.name} name={service.name} status={service.status} detail={service.version || 'Not found'} />
        ))}
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-base font-bold text-white">Research and scraping stack</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <StatusCard name="Firecrawl" status={research.firecrawl.status} detail="Primary research scrape" />
          <StatusCard name="Crawl4AI" status={research.crawl4ai.status} detail="Local fallback" />
          <StatusCard name="Playwright" status={research.playwright.status} detail="Browser preview fallback" />
        </div>
      </section>
    </div>
  )
}

function StatusCard({ name, status, detail }: { name: string; status: string; detail: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
      <p className="text-base font-bold text-white">{name}</p>
      <p className="mt-3 text-sm text-slate-300">{status}</p>
      <p className="mt-2 break-words text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  )
}
