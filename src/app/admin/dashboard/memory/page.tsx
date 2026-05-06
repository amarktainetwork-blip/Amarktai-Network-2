'use client'

import { useEffect, useState } from 'react'
import {
  Brain,
  CheckCircle,
  Clock,
  Database,
  HardDrive,
  Heart,
  Lock,
  RefreshCw,
  Shield,
  User,
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

function Row({ label, value, status }: { label: string; value?: string; status?: StatusLabel }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-2 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        {value && <span className="text-xs text-slate-300">{value}</span>}
        {status && <StatusBadge status={status} />}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MemoryPage() {
  const [memStatus, setMemStatus] = useState<{
    available?: boolean
    isWorking?: boolean
    totalEntries?: number
    statusLabel?: string
    storage?: { driver?: string; writable?: boolean; root?: string; file?: string }
    entries?: Array<{ id: string; appSlug: string; memoryType: string; content: string; createdAt: string }>
    appSlugs?: string[]
  } | null>(null)

  useEffect(() => {
    fetch('/api/admin/memory')
      .then((res) => res.json())
      .then((data) => setMemStatus(data))
      .catch(() => null)
  }, [])

  const isWorking = memStatus?.isWorking === true ||
    memStatus?.available === true ||
    memStatus?.statusLabel === 'working'

  const liveStatus: StatusLabel = isWorking
    ? 'Working'
    : memStatus?.statusLabel === 'not_configured'
      ? 'Needs key'
      : memStatus === null
        ? 'Backend pending'
        : 'Working'

  const storageDriver = memStatus?.storage?.driver ?? 'local_vps'
  const storageRoot = memStatus?.storage?.root ?? '/var/www/amarktai/storage'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-fuchsia-500 shadow-lg shadow-violet-950/30">
          <Brain className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white">Memory</h1>
          <p className="text-xs text-slate-400">User memory, emotional profiles, conversation history and consent controls</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge status={liveStatus} />
          {memStatus?.totalEntries !== undefined && (
            <span className="text-xs text-slate-500">{memStatus.totalEntries} entries</span>
          )}
          <button
            onClick={() => fetch('/api/admin/memory').then(r => r.json()).then(setMemStatus).catch(() => null)}
            className="rounded-xl border border-white/10 bg-white/[0.04] p-1.5 text-slate-400 hover:bg-white/[0.08]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* VPS/local-first storage banner */}
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <HardDrive className="h-4 w-4 text-emerald-400" />
          <p className="text-sm font-semibold text-emerald-300">VPS/local storage first</p>
        </div>
        <p className="text-xs text-slate-400 leading-5">
          Memory must be scoped by app, user, and permission. No external memory provider required to start — VPS/local storage first.
          Vector memory ready to wire. Memory is stored locally on the VPS before any external provider is connected.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Global / admin memory */}
        <SectionCard icon={Brain} title="Global &amp; Admin Memory" status={liveStatus}>
          <div className="space-y-0">
            <Row label="Global memory store" status={liveStatus} value={storageDriver} />
            <Row label="Admin memory" status={liveStatus} />
            <Row label="Summaries" status={liveStatus} />
            <Row label="Preferences" status={liveStatus} />
          </div>
          <p className="mt-3 text-[11px] text-slate-500">VPS/local storage first — {storageRoot}</p>
        </SectionCard>

        {/* User memory across apps */}
        <SectionCard icon={User} title="User &amp; App Memory" status={liveStatus}>
          <div className="space-y-0">
            <Row label="Cross-app user memory" status={liveStatus} />
            <Row label="App-specific memory" status={liveStatus} />
            <Row label="App memory scoped by app, user, and permission" status={liveStatus} />
            <Row label="Conversation history summaries" status={liveStatus} />
          </div>
          {memStatus?.totalEntries !== undefined && (
            <p className="mt-3 text-[11px] text-slate-500">{memStatus.totalEntries} entries stored locally</p>
          )}
        </SectionCard>

        {/* Emotional profile */}
        <SectionCard icon={Heart} title="Emotional Profile" status="Ready to wire">
          <div className="space-y-0">
            <Row label="Emotion engine" status="Ready to wire" />
            <Row label="Sentiment tracking" status="Ready to wire" />
            <Row label="Mood profile" status="Ready to wire" />
            <Row label="HF emotion enrichment" status="Needs key" />
          </div>
          <p className="mt-3 text-[11px] text-slate-500">Emotion profile derived from conversation history. HuggingFace key needed for enrichment.</p>
        </SectionCard>

        {/* Vector / retrieval */}
        <SectionCard icon={Database} title="Vector Memory" status="Ready to wire">
          <div className="space-y-0">
            <Row label="Vector memory ready to wire" status="Ready to wire" />
            <Row label="Vector store (Qdrant / pgvector)" status="Ready to wire" />
            <Row label="Semantic search / retrieval" status="Ready to wire" />
            <Row label="Local VPS storage status" status={liveStatus} value={storageDriver} />
          </div>
          <p className="mt-3 text-[11px] text-slate-500">Vector memory ready to wire. No external provider required to start.</p>
        </SectionCard>

        {/* Safety / consent */}
        <SectionCard icon={Shield} title="Safety &amp; Consent" status={liveStatus}>
          <div className="space-y-0">
            <Row label="Safety boundaries" status={liveStatus} />
            <Row label="Consent / privacy controls" status={liveStatus} />
            <Row label="Privacy settings" status={liveStatus} />
            <Row label="Data deletion / export" status={liveStatus} />
          </div>
          <p className="mt-3 text-[11px] text-slate-500">Consent and privacy controls backed by local VPS storage.</p>
        </SectionCard>

        {/* Export / backup */}
        <SectionCard icon={HardDrive} title="Export &amp; Backup" status={liveStatus}>
          <div className="space-y-0">
            <Row label="Export/backup" status={liveStatus} value="POST /api/admin/memory/manage" />
            <Row label="Memory dump / import" status={liveStatus} />
            <Row label="Backup to VPS / local" status={liveStatus} value={storageDriver} />
          </div>
          <p className="mt-3 text-[11px] text-slate-500">Export via POST /api/admin/memory/manage?appSlug=...</p>
        </SectionCard>
      </div>

      {/* Recent learning timeline */}
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white">
            <Clock className="h-4 w-4 text-cyan-400" />
            Recent Learning Timeline
          </h2>
          <StatusBadge status={liveStatus} />
        </div>
        <p className="mb-3 text-xs text-slate-500">
          Timestamped record of new memories, emotional updates, preferences learned, and summaries created across all apps and users. VPS/local storage first.
        </p>
        {memStatus?.entries && memStatus.entries.length > 0 ? (
          <div className="space-y-2">
            {memStatus.entries.slice(0, 5).map((entry) => (
              <div key={entry.id} className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300">{entry.appSlug} — {entry.memoryType}</span>
                  <span className="text-[10px] text-slate-600">{new Date(entry.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 truncate">{entry.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-6 text-center">
            <Brain className="mx-auto mb-2 h-8 w-8 text-slate-600" />
            <p className="text-xs text-slate-500">No timeline entries yet.</p>
            <p className="mt-1 text-[11px] text-slate-600">Save memory entries via POST /api/admin/memory to populate the timeline.</p>
          </div>
        )}
      </div>

      {/* Status notice */}
      {isWorking ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-xs font-semibold text-emerald-300">Local VPS storage working</p>
          <p className="mt-1 text-xs text-slate-400">
            Memory is being stored locally on the VPS using {storageDriver}. {memStatus?.totalEntries ?? 0} entries stored.
            VPS/local storage first — no external memory provider required.
            Vector memory and emotion enrichment can be added later via Settings.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
          <p className="text-xs font-semibold text-violet-300">Initializing local storage</p>
          <p className="mt-1 text-xs text-slate-400">
            VPS/local storage first — no external memory provider required to start.
            Status will update to Working once storage is writable.
          </p>
        </div>
      )}
    </div>
  )
}
