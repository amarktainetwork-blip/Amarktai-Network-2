import type React from 'react'
import { Database, FileSearch, Globe2, Layers3, Search } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { listRecords } from '@/lib/local-json-store'
import MemoryKnowledgeTools from '@/components/dashboard/MemoryKnowledgeTools'

export const dynamic = 'force-dynamic'

type RagSource = { id: string; title?: string; url?: string; type?: string; chunksCount?: number; ingestedAt?: string }
type ScrapeResult = { id: string; url?: string; title?: string; status?: string; createdAt?: string }
type BrandMemoryRecord = { id: string; [key: string]: unknown }

async function getSnapshot() {
  try {
    const [memoryEntries, profiles] = await Promise.all([
      prisma.memoryEntry.findMany({
        take: 40,
        orderBy: { createdAt: 'desc' },
        select: { id: true, appSlug: true, memoryType: true, key: true, content: true, importance: true, createdAt: true },
      }),
      prisma.appAiProfile.findMany({
        take: 30,
        orderBy: { updatedAt: 'desc' },
        select: { appSlug: true, appName: true, memoryNamespace: true, retrievalNamespace: true, enabledCapabilities: true, updatedAt: true },
      }),
    ])
    return { database: 'working' as const, error: null, memoryEntries, profiles }
  } catch (error) {
    return { database: 'failed' as const, error: error instanceof Error ? error.message : 'Database unavailable', memoryEntries: [], profiles: [] }
  }
}

export default async function MemoryKnowledgePage() {
  const snapshot = await getSnapshot()
  const ragSources = listRecords<RagSource>('rag/sources.json').slice(-20).reverse()
  const scrapeResults = listRecords<ScrapeResult>('research/scrape-results.json').slice(-20).reverse()
  const brandMemoryRecords = listRecords<BrandMemoryRecord>('brand-memory.json').slice(-20).reverse()

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-cyan-300/15 bg-[#071019] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Memory & Knowledge</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white">Context, memory, RAG, and website knowledge</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
              App memory, brand memory, user memory, RAG sources, website scrape results, and knowledge ingestion state are managed together because they all feed runtime context.
            </p>
          </div>
          <StatusPill status={snapshot.database === 'working' ? 'database working' : 'database unavailable'} />
        </div>
      </section>

      {snapshot.error && (
        <p className="rounded-lg border border-amber-300/20 bg-amber-300/8 px-3 py-2 text-sm font-bold text-amber-200">
          Database-backed memory is unavailable: {snapshot.error}
        </p>
      )}

      <nav className="flex flex-wrap gap-2 rounded-lg border border-slate-800 bg-slate-900/55 p-2" aria-label="Memory and knowledge sections">
        {[
          ['User Memory', '#user-memory'],
          ['App Memory', '#app-memory'],
          ['Brand Memory', '#brand-memory'],
          ['Knowledge/RAG', '#knowledge-rag'],
          ['Website Scrapes', '#website-scrapes'],
        ].map(([label, href]) => (
          <a key={label} href={href} className="rounded-lg px-3 py-2 text-xs font-black text-slate-300 hover:bg-slate-800 hover:text-white">
            {label}
          </a>
        ))}
      </nav>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<Database />} label="Memory entries" value={String(snapshot.memoryEntries.length)} />
        <Metric icon={<Layers3 />} label="App profiles" value={String(snapshot.profiles.length)} />
        <Metric icon={<Search />} label="RAG sources" value={String(ragSources.length)} />
        <Metric icon={<Globe2 />} label="Scrape results" value={String(scrapeResults.length)} />
      </section>

      <MemoryKnowledgeTools />

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel id="brand-memory" title="Brand Memory">
          <div className="space-y-3">
            {snapshot.profiles.length ? snapshot.profiles.map((profile) => (
              <article key={profile.appSlug} className="rounded-lg border border-slate-800 bg-slate-950/55 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-white">{profile.appName || profile.appSlug}</p>
                    <p className="mt-1 font-mono text-[11px] text-slate-600">{profile.appSlug}</p>
                  </div>
                  <StatusPill status={profile.memoryNamespace || profile.retrievalNamespace ? 'context set' : 'needs context'} />
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <ProofRow label="Memory namespace" value={profile.memoryNamespace || 'not set'} />
                  <ProofRow label="RAG namespace" value={profile.retrievalNamespace || 'not set'} />
                  <ProofRow label="Brand memory" value={brandMemoryRecords.length ? `${brandMemoryRecords.length} records` : 'not stored'} />
                  <ProofRow label="Capabilities" value={parseCapabilityCount(profile.enabledCapabilities)} />
                </div>
              </article>
            )) : (
              <Empty text="No app or brand memory profiles found." />
            )}
          </div>
        </Panel>

        <Panel id="user-memory" title="User Memory">
          <div className="space-y-3">
            {snapshot.memoryEntries.length ? snapshot.memoryEntries.map((entry) => (
              <article key={entry.id} className="rounded-lg border border-slate-800 bg-slate-950/55 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="line-clamp-1 text-sm font-black text-white">{entry.key || entry.memoryType}</p>
                    <p className="mt-1 font-mono text-[11px] text-slate-600">{entry.appSlug || 'platform'} / importance {entry.importance}</p>
                  </div>
                  <StatusPill status={entry.memoryType || 'memory'} />
                </div>
                <p className="mt-3 line-clamp-3 text-xs leading-6 text-slate-400">{String(entry.content ?? '').slice(0, 240)}</p>
              </article>
            )) : (
              <Empty text="No memory entries found." />
            )}
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel id="app-memory" title="App Memory">
          <div className="space-y-3">
            {snapshot.profiles.length ? snapshot.profiles.map((profile) => (
              <KnowledgeRow
                key={profile.appSlug}
                icon={<Layers3 />}
                title={profile.appName || profile.appSlug}
                status={profile.memoryNamespace || 'not set'}
                detail={`RAG: ${profile.retrievalNamespace || 'not set'}`}
              />
            )) : (
              <Empty text="No app memory profiles found." />
            )}
          </div>
        </Panel>

        <Panel id="knowledge-rag" title="Knowledge/RAG">
          <div className="space-y-3">
            {ragSources.length ? ragSources.map((source, index) => (
              <KnowledgeRow key={source.id ?? source.url ?? index} icon={<FileSearch />} title={source.title || source.url || 'RAG source'} status={`${source.chunksCount ?? 0} chunks`} detail={source.url || source.type || 'stored source'} />
            )) : (
              <Empty text="No RAG source records found. Use ingestion endpoints or Studio research to add knowledge." />
            )}
          </div>
        </Panel>

        <Panel id="website-scrapes" title="Website Scrapes">
          <div className="space-y-3">
            {scrapeResults.length ? scrapeResults.map((result, index) => (
              <KnowledgeRow key={result.id ?? result.url ?? index} icon={<Globe2 />} title={result.title || result.url || 'Scrape result'} status={result.status || 'stored'} detail={result.url || 'website scrape'} />
            )) : (
              <Empty text="No website scrape result records found." />
            )}
          </div>
        </Panel>
      </section>
    </div>
  )
}

function Panel({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return <section id={id} className="rounded-lg border border-slate-800 bg-slate-900/60 p-5"><h2 className="text-lg font-black text-white">{title}</h2><div className="mt-4">{children}</div></section>
}

function Metric({ icon, label, value }: { icon: React.ReactElement; label: string; value: string }) {
  return <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4"><span className="text-cyan-300 [&_svg]:h-5 [&_svg]:w-5">{icon}</span><p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-white">{value}</p></div>
}

function ProofRow({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-800 bg-slate-950/55 px-3 py-2"><p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 break-words text-xs font-bold text-slate-300">{value}</p></div>
}

function KnowledgeRow({ icon, title, status, detail }: { icon: React.ReactElement; title: string; status: string; detail: string }) {
  return (
    <article className="rounded-lg border border-slate-800 bg-slate-950/55 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-cyan-300 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="line-clamp-1 text-sm font-black text-white">{title}</p>
            <StatusPill status={status} />
          </div>
          <p className="mt-2 break-words text-xs leading-6 text-slate-500">{detail}</p>
        </div>
      </div>
    </article>
  )
}

function parseCapabilityCount(value: string) {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? `${parsed.length} enabled` : 'not set'
  } catch {
    return value ? `${value.split(',').filter(Boolean).length} enabled` : 'not set'
  }
}

function StatusPill({ status }: { status: string }) {
  const lower = status.toLowerCase()
  const tone = lower.includes('working') || lower.includes('set') || lower.includes('stored')
    ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
    : lower.includes('unavailable') || lower.includes('failed')
      ? 'border-red-300/20 bg-red-300/10 text-red-100'
      : 'border-amber-300/20 bg-amber-300/10 text-amber-100'
  return <span className={['rounded-full border px-2.5 py-1 text-[11px] font-black', tone].join(' ')}>{status}</span>
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-lg border border-slate-800 bg-slate-950/55 p-4 text-sm leading-7 text-slate-500">{text}</p>
}
