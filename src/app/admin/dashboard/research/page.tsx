'use client'

import {
  Archive,
  CheckCircle,
  Clock,
  Flame,
  Globe,
  Link2,
  Lock,
  Search,
  XCircle,
} from 'lucide-react'

// ── Status badge ──────────────────────────────────────────────────────────────

type StatusLabel = 'Working' | 'Ready to wire' | 'Needs key' | 'Backend pending' | 'Locked'

function StatusBadge({ status }: { status: StatusLabel }) {
  const styles: Record<StatusLabel, string> = {
    Working: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Ready to wire': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    'Needs key': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Backend pending': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    Locked: 'bg-slate-700/40 text-slate-500 border-slate-600/20',
  }
  const icons: Record<StatusLabel, React.ReactNode> = {
    Working: <CheckCircle className="h-3 w-3" />,
    'Ready to wire': <Clock className="h-3 w-3" />,
    'Needs key': <XCircle className="h-3 w-3" />,
    'Backend pending': <Clock className="h-3 w-3" />,
    Locked: <Lock className="h-3 w-3" />,
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles[status]}`}>
      {icons[status]} {status}
    </span>
  )
}

// ── Section card ─────────────────────────────────────────────────────────────

function SectionCard({ icon: Icon, title, status, children }: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  title: string
  status: StatusLabel
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-cyan-400" />
          <p className="text-sm font-bold text-white">{title}</p>
        </div>
        <StatusBadge status={status} />
      </div>
      {children}
    </div>
  )
}

// ── Row item ─────────────────────────────────────────────────────────────────

function Row({ label, status }: { label: string; status: StatusLabel }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-2 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <StatusBadge status={status} />
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ResearchPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-950/30">
          <Search className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white">Scraping / Research</h1>
          <p className="text-xs text-slate-400">Firecrawl-powered web research, crawl jobs, artifact links and scraped storage</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Firecrawl primary */}
        <SectionCard icon={Flame} title="Firecrawl (Primary)" status="Needs key">
          <div className="space-y-0">
            <Row label="Firecrawl API" status="Needs key" />
            <Row label="Single URL scrape" status="Needs key" />
            <Row label="Site crawl" status="Needs key" />
            <Row label="App onboarding scrape" status="Needs key" />
          </div>
          <p className="mt-3 text-[11px] text-slate-600">Set FIRECRAWL_API_KEY in Settings to activate.</p>
        </SectionCard>

        {/* Backup crawler */}
        <SectionCard icon={Globe} title="Backup Crawler" status="Ready to wire">
          <div className="space-y-0">
            <Row label="Fallback crawler" status="Ready to wire" />
            <Row label="Raw HTML extraction" status="Ready to wire" />
          </div>
          <p className="mt-3 text-[11px] text-slate-600">Backup crawler is ready to wire once Firecrawl is configured and primary path is validated.</p>
        </SectionCard>

        {/* Scraped page storage */}
        <SectionCard icon={Archive} title="Scraped Page Storage" status="Backend pending">
          <div className="space-y-0">
            <Row label="Scraped webpage storage" status="Backend pending" />
            <Row label="Artifact links" status="Backend pending" />
            <Row label="Source/reference index" status="Backend pending" />
          </div>
          <p className="mt-3 text-[11px] text-slate-600">Storage backend must be wired before scraped pages are persisted.</p>
        </SectionCard>

        {/* Crawl job history */}
        <SectionCard icon={Link2} title="Crawl Job History" status="Backend pending">
          <div className="space-y-0">
            <Row label="Job history" status="Backend pending" />
            <Row label="Job status" status="Backend pending" />
            <Row label="Result artifacts" status="Backend pending" />
          </div>
          <p className="mt-3 text-[11px] text-slate-600">Crawl history will appear here once the job queue and storage are wired.</p>
        </SectionCard>
      </div>

      {/* Notice */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-xs font-semibold text-amber-300">Needs key / Backend pending</p>
        <p className="mt-1 text-xs text-slate-400">
          Firecrawl is the primary scraping provider. Set <code className="rounded bg-white/10 px-1 text-amber-200">FIRECRAWL_API_KEY</code> in Settings to begin. Storage and job history require the storage backend to be configured. No Working status will be shown until endpoint proof exists.
        </p>
      </div>
    </div>
  )
}
