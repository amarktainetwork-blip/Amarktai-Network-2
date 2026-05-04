'use client'

import {
  Brain,
  CheckCircle,
  Clock,
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

export default function MemoryEmotionsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-fuchsia-500 shadow-lg shadow-violet-950/30">
          <Brain className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white">Memory / Emotions</h1>
          <p className="text-xs text-slate-400">User memory, emotional profiles, conversation history and consent controls</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* User memory across apps */}
        <SectionCard icon={User} title="User Memory" status="Backend pending">
          <div className="space-y-0">
            <Row label="Cross-app user memory" status="Backend pending" />
            <Row label="App-specific preferences" status="Backend pending" />
            <Row label="Conversation history summaries" status="Backend pending" />
            <Row label="Mem0 integration" status="Ready to wire" />
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

        {/* Storage backend */}
        <SectionCard icon={Brain} title="Storage Backend" status="Backend pending">
          <div className="space-y-0">
            <Row label="Internal memory storage" status="Backend pending" />
            <Row label="Vector store (Qdrant / pgvector)" status="Backend pending" />
            <Row label="Mem0 client" status="Ready to wire" />
          </div>
          <p className="mt-3 text-[11px] text-slate-600">Storage driver must be configured before memory is persisted.</p>
        </SectionCard>

        {/* Safety / consent */}
        <SectionCard icon={Shield} title="Safety &amp; Consent" status="Backend pending">
          <div className="space-y-0">
            <Row label="Safety boundaries" status="Backend pending" />
            <Row label="Consent controls" status="Backend pending" />
            <Row label="Privacy settings" status="Backend pending" />
            <Row label="Data deletion" status="Backend pending" />
          </div>
          <p className="mt-3 text-[11px] text-slate-600">Consent and privacy controls will be surfaced here once the memory backend is wired.</p>
        </SectionCard>
      </div>

      {/* Notice */}
      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
        <p className="text-xs font-semibold text-violet-300">Backend pending</p>
        <p className="mt-1 text-xs text-slate-400">
          This section is frontend-ready. No memory or emotion data is being stored or processed until the storage backend, Mem0 client, and vector store are wired and verified. Status will update to Working only after endpoint proof exists.
        </p>
      </div>
    </div>
  )
}
