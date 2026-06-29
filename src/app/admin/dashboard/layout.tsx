'use client'

import '@fontsource-variable/inter'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Headphones, LogOut, Mic, Network, SlidersHorizontal, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { DASHBOARD_NAV_ITEMS } from '@/lib/dashboard-nav'
import BrandName from '@/components/BrandName'

type HeaderStatus = { appStatus: string }
type CapabilityStatus = 'working' | 'wired_unproven' | 'blocked' | 'missing'
type VoiceTruth = {
  tts: { status: CapabilityStatus; blocker: string; nextAction: string }
  stt: { status: CapabilityStatus; blocker: string; nextAction: string }
  realtime: { status: CapabilityStatus; blocker: string; nextAction: string }
}

const DEFAULT_VOICE_TRUTH: VoiceTruth = {
  tts: { status: 'missing', blocker: 'TTS truth has not loaded yet.', nextAction: 'Open Capabilities for current TTS status.' },
  stt: { status: 'missing', blocker: 'STT truth has not loaded yet.', nextAction: 'Open Capabilities for current STT status.' },
  realtime: { status: 'missing', blocker: 'Realtime voice has not been checked yet.', nextAction: 'Check /api/realtime/session.' },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [assistantVoice, setAssistantVoice] = useState('AmarktAI Voice')
  const [status, setStatus] = useState<HeaderStatus>({ appStatus: 'Checking readiness' })
  const [voiceTruth, setVoiceTruth] = useState<VoiceTruth>(DEFAULT_VOICE_TRUTH)
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    let mounted = true
    Promise.all([
      fetch('/api/admin/settings/status').then(r => r.json()).catch(() => null),
      fetch('/api/admin/system/capabilities').then(r => r.json()).catch(() => null),
      fetch('/api/realtime/session', { method: 'POST' }).then(async (r) => ({ ok: r.ok, status: r.status, body: await r.json().catch(() => ({})) })).catch(() => null),
    ]).then(([response, capabilityResponse, realtimeResponse]) => {
      if (!mounted) return
      const truth = response?.truth
      const connected = Number(truth?.connectedCount ?? 0)
      const storageConnected = Boolean(truth?.storage?.connected)
      setStatus({ appStatus: storageConnected ? `${connected} connections configured` : 'Storage needs setup' })
      const capabilities = Array.isArray(capabilityResponse?.capabilities) ? capabilityResponse.capabilities as Array<Record<string, unknown>> : []
      const capability = (id: string) => capabilities.find((entry) => entry.capabilityId === id)
      setVoiceTruth({
        tts: voiceCapabilityTruth(capability('tts')),
        stt: voiceCapabilityTruth(capability('stt')),
        realtime: realtimeResponse?.ok
          ? { status: 'working', blocker: '', nextAction: '' }
          : {
            status: realtimeResponse?.status === 501 ? 'missing' : 'blocked',
            blocker: String(realtimeResponse?.body?.error ?? 'Realtime voice session endpoint did not return a working session.'),
            nextAction: realtimeResponse?.status === 501 ? 'Wire realtime voice sessions to an approved active provider.' : 'Check realtime voice session route.',
          },
      })
      setPulse(true)
    })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const id = setInterval(() => setPulse(p => !p), 3000)
    return () => clearInterval(id)
  }, [])

  const handleLogout = useCallback(async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }, [router])

  const isActive = (href: string) => {
    if (href === '/admin/dashboard') return pathname === href
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100" style={{ fontFamily: "'Inter Variable','Inter',system-ui,-apple-system,sans-serif" }}>
      {/* Background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-64 -top-64 h-[600px] w-[600px] rounded-full bg-cyan-950/20 blur-[120px]" />
        <div className="absolute -right-64 top-1/3 h-[500px] w-[500px] rounded-full bg-indigo-950/25 blur-[120px]" />
      </div>

      {/* Top navigation header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/90 backdrop-blur-2xl">
        <div className="flex min-h-12 items-center gap-3 px-4 lg:px-5">
          {/* Logo */}
          <Link href="/admin/dashboard" className="flex shrink-0 items-center gap-2 pr-3 border-r border-slate-800/60">
            <Network className="h-4 w-4 text-cyan-300" aria-hidden />
            <span className="hidden text-xs font-black tracking-tight text-slate-100 sm:inline"><BrandName /></span>
          </Link>

          {/* Nav links — horizontal scroll on mobile */}
          <nav
            className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto scrollbar-none"
            aria-label="Dashboard navigation"
          >
            {DASHBOARD_NAV_ITEMS.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-150 whitespace-nowrap',
                    active
                      ? 'border-cyan-500/25 bg-cyan-500/10 text-cyan-300'
                      : 'border-transparent text-slate-500 hover:border-slate-700/50 hover:bg-slate-800/40 hover:text-slate-300',
                  ].join(' ')}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Right: pulse indicator + voice + logout */}
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-1.5 sm:flex">
              <span
                className="h-1.5 w-1.5 rounded-full bg-cyan-400 transition-opacity duration-700"
                style={{ opacity: pulse ? 1 : 0.3, boxShadow: pulse ? '0 0 6px rgba(34,211,238,0.8)' : 'none' }}
              />
              <span className="hidden text-[10px] font-bold text-slate-500 lg:inline">{status.appStatus}</span>
            </div>
            <VoiceAssistantButton
              open={assistantOpen}
              voice={assistantVoice}
              status={voiceTruth.tts.status}
              onClick={() => setAssistantOpen((c) => !c)}
            />
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-slate-700/60 bg-slate-800/60 p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative mx-auto w-full max-w-[1600px] px-4 py-6 lg:px-6">
        {children}
      </main>

      {/* Floating voice assistant panel */}
      <VoiceAssistantPanel
        open={assistantOpen}
        voice={assistantVoice}
        truth={voiceTruth}
        setVoice={setAssistantVoice}
        onClose={() => setAssistantOpen(false)}
      />
    </div>
  )
}

function voiceCapabilityTruth(entry?: Record<string, unknown>): VoiceTruth['tts'] {
  const status = entry?.status === 'working' || entry?.status === 'wired_unproven' || entry?.status === 'blocked' || entry?.status === 'missing'
    ? entry.status
    : 'missing'
  return {
    status,
    blocker: typeof entry?.blocker === 'string' ? entry.blocker : '',
    nextAction: typeof entry?.nextAction === 'string' ? entry.nextAction : '',
  }
}

function voiceStatusLabel(status: CapabilityStatus) {
  if (status === 'working') return 'ready'
  if (status === 'wired_unproven') return 'needs proof'
  return status
}

function VoiceAssistantButton({ open, voice, status, onClick }: { open: boolean; voice: string; status: CapabilityStatus; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-dashboard-voice-assistant="trigger"
      className={[
        'inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-black transition',
        open ? 'border-blue-400/30 bg-blue-400/12 text-blue-200' : 'border-slate-700/60 bg-slate-800/60 text-slate-300 hover:border-blue-400/25 hover:text-blue-200',
      ].join(' ')}
      aria-expanded={open}
      aria-controls="dashboard-voice-assistant"
    >
      <Mic className="h-3.5 w-3.5 text-blue-400" />
      <span className="hidden sm:inline">{voice}</span>
      <span className="hidden rounded-full border border-amber-300/25 bg-amber-300/10 px-1.5 py-0.5 text-[9px] text-amber-200 md:inline">TTS {voiceStatusLabel(status)}</span>
    </button>
  )
}

function VoiceAssistantPanel({
  open, voice, truth, setVoice, onClose,
}: {
  open: boolean
  voice: string
  truth: VoiceTruth
  setVoice: (v: string) => void
  onClose: () => void
}) {
  if (!open) return null
  return (
    <aside
      id="dashboard-voice-assistant"
      data-dashboard-voice-assistant="panel"
      className="fixed bottom-5 right-5 z-50 w-[min(380px,calc(100vw-2rem))] rounded-2xl border border-slate-700/70 bg-slate-950/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-blue-400/25 bg-blue-400/10 text-blue-300">
            <Headphones className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-black text-white">Dashboard Assistant</p>
            <p className="mt-0.5 text-xs font-bold text-amber-200">TTS {voiceStatusLabel(truth.tts.status)}; STT {voiceStatusLabel(truth.stt.status)}; realtime {voiceStatusLabel(truth.realtime.status)}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-200" aria-label="Close assistant">
          <X className="h-4 w-4" />
        </button>
      </div>
      <label className="mt-4 block">
        <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Voice shortcut
        </span>
        <select
          value={voice}
          onChange={(e) => setVoice(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-slate-200 outline-none focus:border-blue-400/50"
        >
          {['AmarktAI Voice', 'Calm Operator', 'Fast Assistant', 'Narrator'].map((o) => <option key={o}>{o}</option>)}
        </select>
      </label>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button type="button" className="rounded-xl border border-blue-400/25 bg-blue-400/10 px-3 py-2 text-xs font-black text-blue-200">
          TTS preview: {voiceStatusLabel(truth.tts.status)}
        </button>
        <button type="button" disabled={truth.realtime.status !== 'working'} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-black text-slate-500">
          Realtime session: {voiceStatusLabel(truth.realtime.status)}
        </button>
      </div>
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 p-3">
        <div className="space-y-2 text-xs leading-6 text-slate-400">
          <VoiceTruthLine label="TTS" item={truth.tts} />
          <VoiceTruthLine label="STT" item={truth.stt} />
          <VoiceTruthLine label="Realtime voice" item={truth.realtime} />
        </div>
      </div>
    </aside>
  )
}

function VoiceTruthLine({ label, item }: { label: string; item: VoiceTruth['tts'] }) {
  return (
    <p>
      <span className="font-black text-slate-300">{label}: {voiceStatusLabel(item.status)}.</span>
      {item.blocker ? ` ${item.blocker}` : ''}
      {item.nextAction ? ` ${item.nextAction}` : ''}
    </p>
  )
}
