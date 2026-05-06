'use client'

import {
  Archive,
  ArrowRight,
  CheckCircle,
  Clock,
  Eye,
  Flame,
  Globe,
  Link2,
  Lock,
  Search,
  Sparkles,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

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
  const [manualUrl, setManualUrl] = useState('')
  const [localStorageOk, setLocalStorageOk] = useState<boolean | null>(null)
  const [jobCount, setJobCount] = useState<number | null>(null)
  const [hasFirecrawl, setHasFirecrawl] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/admin/research/jobs?limit=5')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!data) return
        setLocalStorageOk(data.storageWritable ?? data.localStorageOk ?? (data.driver === 'local_vps' || Array.isArray(data.jobs)))
        setJobCount(Array.isArray(data.jobs) ? data.jobs.length : 0)
        setHasFirecrawl(data.hasFirecrawl ?? false)
      })
      .catch(() => { /* keep null — show "Backend pending" */ })
  }, [])

  const storageStatus: StatusLabel = localStorageOk === null ? 'Backend pending' : localStorageOk ? 'Working' : 'Backend pending'
  const jobsStatus: StatusLabel = jobCount === null ? 'Backend pending' : 'Working'
  const firecrawlStatus: StatusLabel = hasFirecrawl ? 'Working' : 'Needs key'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-950/30">
          <Search className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white">Research</h1>
          <p className="text-xs text-slate-400">URL research workbench — Firecrawl-powered with backup crawler, scraped storage, and opportunity pipeline</p>
        </div>
        <div className="ml-auto">
          <StatusBadge status={firecrawlStatus} />
        </div>
      </div>

      {/* Manual URL Input — primary research workbench */}
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white">
            <Search className="h-4 w-4 text-cyan-400" />
            Manual URL Input
          </h2>
          <StatusBadge status={firecrawlStatus} />
        </div>
        <p className="mb-4 text-xs text-slate-500">
          Enter a URL to research. Firecrawl is the primary scraper. A backup crawler handles fallback. Results are stored on VPS.
        </p>
        <div className="flex gap-2">
          <input
            type="url"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="https://example.com — URL to research"
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/30"
          />
          <button
            disabled
            className="inline-flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-xs font-bold text-amber-300 opacity-70 cursor-not-allowed"
            title="Set FIRECRAWL_API_KEY in Settings to activate"
          >
            Scrape
          </button>
        </div>
        <p className="mt-2 text-[11px] text-slate-600">
          Set <code className="rounded bg-white/10 px-1 text-amber-200">FIRECRAWL_API_KEY</code> in{' '}
          <Link href="/admin/dashboard/settings" className="text-cyan-400 hover:underline">Settings</Link>{' '}
          to activate. Manual notes and source upload available below.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Row label="Firecrawl scrape" status={firecrawlStatus} />
          <Row label="Backup crawler" status="Ready to wire" />
          <Row label="Scraped storage on VPS" status={storageStatus} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Firecrawl primary */}
        <SectionCard icon={Flame} title="Firecrawl (Primary)" status={firecrawlStatus}>
          <div className="space-y-0">
            <Row label="Firecrawl API" status={firecrawlStatus} />
            <Row label="Single URL scrape" status={firecrawlStatus} />
            <Row label="Site crawl" status={firecrawlStatus} />
            <Row label="App onboarding scrape" status={firecrawlStatus} />
          </div>
          <p className="mt-3 text-[11px] text-slate-600">Set FIRECRAWL_API_KEY in Settings to activate.</p>
        </SectionCard>

        {/* Backup crawler */}
        <SectionCard icon={Globe} title="Backup Crawler" status="Ready to wire">
          <div className="space-y-0">
            <Row label="Fallback crawler" status="Ready to wire" />
            <Row label="Raw HTML extraction" status="Ready to wire" />
          </div>
          <p className="mt-3 text-[11px] text-slate-600">Backup crawler is ready to wire once Firecrawl is configured and primary path is validated. Research does not rely only on Firecrawl.</p>
        </SectionCard>

        {/* Scraped page storage */}
        <SectionCard icon={Archive} title="Scraped Page Storage (VPS)" status={storageStatus}>
          <div className="space-y-0">
            <Row label="Scraped webpage storage on VPS" status={storageStatus} />
            <Row label="Artifact links" status={storageStatus} />
            <Row label="Source/reference index" status={storageStatus} />
            <Row label="Screenshot / manual review" status={storageStatus} />
          </div>
          <p className="mt-3 text-[11px] text-slate-600">
            {storageStatus === 'Working'
              ? 'Local VPS storage is active and writable.'
              : 'Storage backend must be wired before scraped pages are persisted on VPS.'}
          </p>
        </SectionCard>

        {/* Crawl job history */}
        <SectionCard icon={Link2} title="Research Jobs" status={jobsStatus}>
          <div className="space-y-0">
            <Row label="Job history" status={jobsStatus} />
            <Row label="Job status" status={jobsStatus} />
            <Row label="Result artifacts" status={storageStatus} />
          </div>
          <p className="mt-3 text-[11px] text-slate-600">
            {jobsStatus === 'Working'
              ? `Local research job queue active. ${jobCount === 0 ? 'No jobs recorded yet.' : `${jobCount} job(s) found.`}`
              : 'Research job history will appear here once the job queue and storage are wired.'}
          </p>
        </SectionCard>
      </div>

      {/* Notice */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-xs font-semibold text-amber-300">Firecrawl key required for live crawling</p>
        <p className="mt-1 text-xs text-slate-400">
          Firecrawl is the primary scraping provider. Research does not rely only on Firecrawl — a backup crawler handles fallback. Set <code className="rounded bg-white/10 px-1 text-amber-200">FIRECRAWL_API_KEY</code> in Settings to begin. Local VPS storage and job history are active.
        </p>
      </div>

      {/* App Discovery / Researcher Agent */}
      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/20 border border-violet-500/20">
            <Eye className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">App Discovery / Researcher Agent</p>
            <p className="text-[11px] text-slate-400">Status: <span className="text-cyan-400">Ready to wire</span></p>
          </div>
        </div>
        <p className="text-xs text-slate-400 leading-5">
          The Researcher Agent discovers new AI tools, providers, and app opportunities. It analyses competitor products, creates improved alternative plans, packages them as product specs, and routes them to Repo Workbench for implementation.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { label: 'Research new AI tools / providers', status: 'Ready to wire' as StatusLabel },
            { label: 'Alert admin of app opportunities', status: 'Ready to wire' as StatusLabel },
            { label: 'Create improved alternative app plan', status: 'Ready to wire' as StatusLabel },
            { label: 'Create differentiated product plan', status: 'Ready to wire' as StatusLabel },
            { label: 'Create product package / spec', status: 'Ready to wire' as StatusLabel },
            { label: 'Competitor analysis scraping', status: 'Needs key' as StatusLabel },
            { label: 'Opportunity alert notifications', status: 'Backend pending' as StatusLabel },
            { label: 'Discovery history / archive', status: 'Backend pending' as StatusLabel },
          ].map(({ label, status }) => (
            <Row key={label} label={label} status={status} />
          ))}
        </div>
        <p className="text-[11px] text-slate-600">
          Researcher Agent backend wiring is in Phase 2. Requires Firecrawl key and a planning model (GenX or direct).
        </p>
      </div>

      {/* Opportunity Pipeline */}
      <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/[0.03] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            Opportunity Pipeline
          </h2>
          <StatusBadge status="Ready to wire" />
        </div>
        <p className="mb-4 text-xs text-slate-400 leading-5">
          Competitor reports and app opportunity alerts feed into the pipeline. Use research findings to create a differentiated product plan and send it to Repo Workbench.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-semibold text-slate-300">Competitor Reports</p>
            <p className="mt-1 text-[11px] text-slate-500">Scraped competitor analysis stored on VPS.</p>
            <StatusBadge status="Backend pending" />
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-semibold text-slate-300">App Opportunity Alerts</p>
            <p className="mt-1 text-[11px] text-slate-500">Alerts when the agent discovers a product gap.</p>
            <StatusBadge status="Backend pending" />
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-semibold text-slate-300">Create App Plan</p>
            <p className="mt-1 text-[11px] text-slate-500">Create improved alternative or differentiated product plan from research.</p>
            <StatusBadge status="Ready to wire" />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button disabled className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-400 opacity-60 cursor-not-allowed">
            Create improved alternative
          </button>
          <Link href="/admin/dashboard/repo-workbench" className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] px-3 py-2 text-xs font-semibold text-cyan-400 hover:bg-cyan-400/[0.10]">
            Send to Repo Workbench <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <p className="mt-3 text-[11px] text-slate-600">
          Create improved alternative or differentiated product plan from research, then send to Repo Workbench.
        </p>
      </div>
    </div>
  )
}
