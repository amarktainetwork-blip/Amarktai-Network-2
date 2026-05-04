'use client'

import { useState } from 'react'
import {
  Bot,
  Brain,
  CheckCircle,
  Clock,
  FileText,
  Mic,
  MicOff,
  Route,
  ShieldCheck,
  Sparkles,
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
    Locked: <XCircle className="h-3 w-3" />,
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles[status]}`}>
      {icons[status]} {status}
    </span>
  )
}

// ── Info card ────────────────────────────────────────────────────────────────

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{title}</p>
      {children}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AivaChatPage() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'aiva'; text: string }>>([])

  function handleSend() {
    const text = input.trim()
    if (!text) return
    setMessages((prev) => [...prev, { role: 'user', text }])
    setInput('')
    // Stub response — backend stream not wired yet
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'aiva',
          text: 'Aiva stream backend is not yet wired. Status: Ready to wire. Configure provider keys in Settings to enable live responses.',
        },
      ])
    }, 400)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 shadow-lg shadow-cyan-950/30">
          <Bot className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white">Aiva Chat</h1>
          <p className="text-xs text-slate-400">Operator conversation interface — fixed within page layout</p>
        </div>
        <div className="ml-auto">
          <StatusBadge status="Ready to wire" />
        </div>
      </div>

      {/* Main layout */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Conversation panel */}
        <div className="flex flex-col gap-3">
          <div className="min-h-[360px] rounded-2xl border border-white/10 bg-[#070d1a]/60 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <p className="text-xs font-semibold text-slate-300">Conversation</p>
              <StatusBadge status="Ready to wire" />
            </div>

            <div className="space-y-3 pb-4">
              {messages.length === 0 && (
                <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4 text-center">
                  <Bot className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                  <p className="text-sm text-slate-500">No messages yet.</p>
                  <p className="mt-1 text-xs text-slate-600">Backend stream is not wired — responses will show stub replies until the provider key and endpoint are configured in Settings.</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === 'user'
                        ? 'bg-cyan-500/10 text-cyan-100 border border-cyan-500/20'
                        : 'bg-white/[0.05] text-slate-300 border border-white/10'
                    }`}
                  >
                    {msg.role === 'aiva' && (
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-violet-400">Aiva</p>
                    )}
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="mt-auto flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Message Aiva... (backend not yet wired)"
                className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder-slate-600 outline-none"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="rounded-xl bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-400 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Side panels */}
        <div className="space-y-3">
          {/* Context / status */}
          <InfoCard title="Context &amp; Status">
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-center justify-between">
                <span>Provider stream</span>
                <StatusBadge status="Ready to wire" />
              </div>
              <div className="flex items-center justify-between">
                <span>Memory context</span>
                <StatusBadge status="Backend pending" />
              </div>
              <div className="flex items-center justify-between">
                <span>Emotion profile</span>
                <StatusBadge status="Backend pending" />
              </div>
            </div>
          </InfoCard>

          {/* Route / provider info */}
          <InfoCard title="Route &amp; Provider">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Route className="h-3 w-3 shrink-0 text-cyan-400" />
              <span>GenX gateway — configure in Settings</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-600">No provider key detected. Set GENX_API_KEY in Settings to activate routing.</p>
          </InfoCard>

          {/* Action approval queue preview */}
          <InfoCard title="Action Approval Queue">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="h-3 w-3 shrink-0 text-violet-400" />
              <span>No pending actions</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge status="Ready to wire" />
              <span className="text-[11px] text-slate-600">Approval queue backend not wired</span>
            </div>
          </InfoCard>

          {/* Memory / emotion preview */}
          <InfoCard title="Memory / Emotion Preview">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Brain className="h-3 w-3 shrink-0 text-violet-400" />
              <span>No memory loaded</span>
            </div>
            <StatusBadge status="Backend pending" />
          </InfoCard>

          {/* Voice / media status */}
          <InfoCard title="Voice &amp; Media">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-slate-400">
                  <Mic className="h-3 w-3" /> STT
                </span>
                <StatusBadge status="Ready to wire" />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-slate-400">
                  <MicOff className="h-3 w-3" /> TTS
                </span>
                <StatusBadge status="Ready to wire" />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-slate-400">
                  <FileText className="h-3 w-3" /> Artifacts
                </span>
                <StatusBadge status="Backend pending" />
              </div>
            </div>
          </InfoCard>
        </div>
      </div>
    </div>
  )
}
