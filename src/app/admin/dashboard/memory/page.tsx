'use client'

import {
  Brain,
  CheckCircle,
  Clock,
  Database,
  HardDrive,
  Heart,
  Lock,
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
        <SectionCard icon={Brain} title="Global &amp; Admin Memory" status="Backend pending">
          <div className="space-y-0">
            <Row label="Global memory store" status="Backend pending" />
            <Row label="Admin memory" status="Backend pending" />
            <Row label="Summaries" status="Backend pending" />
            <Row label="Preferences" status="Backend pending" />
          </div>
          <p className="mt-3 text-[11px] text-slate-600">VPS/local storage first. No external memory provider required to start.</p>
        </SectionCard>

        {/* User memory across apps */}
        <SectionCard icon={User} title="User &amp; App Memory" status="Backend pending">
          <div className="space-y-0">
            <Row label="Cross-app user memory" status="Backend pending" />
            <Row label="App-specific memory" status="Backend pending" />
            <Row label="App memory scoped by app, user, and permission" status="Backend pending" />
            <Row label="Conversation history summaries" status="Backend pending" />
          </div>
          <p className="mt-3 text-[11px] text-slate-600">Memory storage backend not yet wired. No data is being stored or read.</p>
        </SectionCard>

        {/* Emotional profile */}
        <SectionCard icon={Heart} title="Emotional Profile" status="Backend pending">
          <div className="space-y-0">
            <Row label="Emotion engine" status="Backend pending" />
            <Row label="Sentiment tracking" status="Backend pending" />
            <Row label="Mood profile" status="Backend pending" />
            <Row label="HF emotion enrichment" status="Ready to wire" />
          </div>
          <p className="mt-3 text-[11px] text-slate-600">Emotion profile will be derived from conversation history once backend is wired.</p>
        </SectionCard>

        {/* Vector / retrieval */}
        <SectionCard icon={Database} title="Vector Memory" status="Ready to wire">
          <div className="space-y-0">
            <Row label="Vector memory ready to wire" status="Ready to wire" />
            <Row label="Vector store (Qdrant / pgvector)" status="Backend pending" />
            <Row label="Semantic search / retrieval" status="Backend pending" />
            <Row label="Local VPS storage status" status="Backend pending" />
          </div>
          <p className="mt-3 text-[11px] text-slate-600">Vector memory ready to wire. No external memory provider required to start.</p>
        </SectionCard>

        {/* Safety / consent */}
        <SectionCard icon={Shield} title="Safety &amp; Consent" status="Backend pending">
          <div className="space-y-0">
            <Row label="Safety boundaries" status="Backend pending" />
            <Row label="Consent / privacy controls" status="Backend pending" />
            <Row label="Privacy settings" status="Backend pending" />
            <Row label="Data deletion / export" status="Backend pending" />
          </div>
          <p className="mt-3 text-[11px] text-slate-600">Consent and privacy controls will be surfaced here once the memory backend is wired.</p>
        </SectionCard>

        {/* Export / backup */}
        <SectionCard icon={HardDrive} title="Export &amp; Backup" status="Backend pending">
          <div className="space-y-0">
            <Row label="Export/backup placeholder" status="Backend pending" />
            <Row label="Memory dump / import" status="Backend pending" />
            <Row label="Backup to VPS / local" status="Backend pending" />
          </div>
          <p className="mt-3 text-[11px] text-slate-600">Export and backup require the storage backend to be wired first.</p>
        </SectionCard>
      </div>

      {/* Recent learning timeline */}
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white">
            <Clock className="h-4 w-4 text-cyan-400" />
            Recent Learning Timeline
          </h2>
          <StatusBadge status="Backend pending" />
        </div>
        <p className="mb-3 text-xs text-slate-500">
          Timestamped record of new memories, emotional updates, preferences learned, and summaries created across all apps and users. VPS/local storage first.
        </p>
        <div className="rounded-xl border border-white/[0.06] bg-black/20 p-6 text-center">
          <Brain className="mx-auto mb-2 h-8 w-8 text-slate-600" />
          <p className="text-xs text-slate-500">No timeline entries yet.</p>
          <p className="mt-1 text-[11px] text-slate-600">Timeline populates once the memory storage backend is wired.</p>
        </div>
      </div>

      {/* Notice */}
      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
        <p className="text-xs font-semibold text-violet-300">Backend pending</p>
        <p className="mt-1 text-xs text-slate-400">
          This section is frontend-ready. No memory or emotion data is being stored or processed until the storage backend and vector store are wired and verified.
          VPS/local storage first — no external memory provider required to start.
          Status will update to Working only after endpoint proof exists.
        </p>
      </div>
    </div>
  )
}
