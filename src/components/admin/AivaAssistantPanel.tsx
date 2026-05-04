'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, ChevronDown, ChevronUp, Loader2, MessageSquare, Play, Send, Settings2, Sparkles, Volume2, X } from 'lucide-react'

type CostPreference = 'free_first' | 'cheap' | 'balanced' | 'premium'
type Capability = 'chat' | 'coding' | 'reasoning' | 'creative' | 'research'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  text: string
  meta?: string
}

interface VoiceOption {
  id: string
  label: string
  provider: string
  model: string
  verified: boolean
  blocker: string | null
}

function parseSseChunk(raw: string) {
  const events: Array<{ event: string; data: unknown }> = []
  const blocks = raw.split('\n\n')
  for (const block of blocks) {
    const eventLine = block.split('\n').find((line) => line.startsWith('event:'))
    const dataLine = block.split('\n').find((line) => line.startsWith('data:'))
    if (!eventLine || !dataLine) continue
    const event = eventLine.slice('event:'.length).trim()
    const dataText = dataLine.slice('data:'.length).trim()
    try {
      events.push({ event, data: JSON.parse(dataText) })
    } catch {
      events.push({ event, data: { text: dataText } })
    }
  }
  return events
}

export default function AivaAssistantPanel() {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showRoute, setShowRoute] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'system', text: 'AmarktAI Assistant is online when enabled. It streams through the admin conversation route and only reports actions proven by backend results.' },
  ])
  const [input, setInput] = useState('')
  const [costPreference, setCostPreference] = useState<CostPreference>('cheap')
  const [capability, setCapability] = useState<Capability>('chat')
  const [voices, setVoices] = useState<VoiceOption[]>([])
  const [selectedVoiceId, setSelectedVoiceId] = useState('')
  const [voiceStatus, setVoiceStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [routeMeta, setRouteMeta] = useState('Smart routing enabled')
  const [streamStatus, setStreamStatus] = useState('Ready')
  const abortRef = useRef<AbortController | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const assistantText = useMemo(() => messages.filter((message) => message.role !== 'system'), [messages])
  const verifiedVoices = useMemo(() => voices.filter((voice) => voice.verified), [voices])
  const selectedVoice = useMemo(() => voices.find((voice) => voice.id === selectedVoiceId) ?? null, [selectedVoiceId, voices])
  const latestAssistant = useMemo(() => [...messages].reverse().find((message) => message.role === 'assistant' && message.text.trim()), [messages])

  useEffect(() => {
    async function loadVoices() {
      try {
        const res = await fetch('/api/admin/voice/options')
        const data = await res.json().catch(() => ({}))
        if (res.ok && data.success !== false) {
          const nextVoices = (data.voices ?? []) as VoiceOption[]
          setVoices(nextVoices)
          const firstVerified = nextVoices.find((voice) => voice.verified)
          if (firstVerified) setSelectedVoiceId((current) => current || firstVerified.id)
        }
      } catch {
        setVoiceStatus('Voice options unavailable')
      }
    }
    loadVoices()
  }, [])

  async function send() {
    const prompt = input.trim()
    if (!prompt || busy) return
    setInput('')
    setBusy(true)
    setShowRoute(false)
    setRouteMeta('Planning smart route…')
    setStreamStatus('Streaming')
    setMessages((current) => [...current, { role: 'user', text: prompt }, { role: 'assistant', text: '', meta: 'streaming' }])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/admin/conversation/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          capability,
          costPreference,
          useSmartRouting: true,
          appProfile: {
            appSlug: 'amarktai-network',
            appType: 'ai-operating-system',
            safetyProfile: 'standard',
            defaultCostPreference: costPreference,
          },
        }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        throw new Error(`Stream failed with HTTP ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''
        for (const part of parts) {
          const events = parseSseChunk(`${part}\n\n`)
          for (const item of events) {
            const data = item.data as Record<string, unknown>
            if (item.event === 'status' && typeof data.message === 'string') setStreamStatus(data.message)
            if (item.event === 'token' && typeof data.text === 'string') {
              setMessages((current) => {
                const copy = [...current]
                const last = copy[copy.length - 1]
                if (last?.role === 'assistant') copy[copy.length - 1] = { ...last, text: `${last.text}${data.text}` }
                return copy
              })
            }
            if (item.event === 'route') {
              const selected = data.selected as { provider?: string; model?: string; reason?: string } | null | undefined
              if (selected?.provider || selected?.model) setRouteMeta(`${selected.provider ?? 'provider'} · ${selected.model ?? 'model'}${selected.reason ? ` · ${selected.reason}` : ''}`)
            }
            if (item.event === 'done') {
              setRouteMeta(`${String(data.provider ?? 'provider')} · ${String(data.model ?? 'model')} · smart routing ${data.smartRouting ? 'on' : 'off'}`)
              setStreamStatus('Done')
            }
            if (item.event === 'error') {
              setStreamStatus('Error')
              setMessages((current) => {
                const copy = [...current]
                const last = copy[copy.length - 1]
                const msg = typeof data.message === 'string' ? data.message : 'AmarktAI Assistant stream error'
                if (last?.role === 'assistant') copy[copy.length - 1] = { ...last, text: last.text ? `${last.text}\n\n${msg}` : msg, meta: 'error' }
                return copy
              })
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        setStreamStatus('Error')
        setMessages((current) => {
          const copy = [...current]
          const last = copy[copy.length - 1]
          const msg = error instanceof Error ? error.message : 'AmarktAI Assistant failed'
          if (last?.role === 'assistant') copy[copy.length - 1] = { ...last, text: last.text ? `${last.text}\n\n${msg}` : msg, meta: 'error' }
          return copy
        })
      }
    } finally {
      setBusy(false)
      abortRef.current = null
    }
  }

  function stop() {
    abortRef.current?.abort()
    audioRef.current?.pause()
    setBusy(false)
    setSpeaking(false)
    setStreamStatus('Stopped')
  }

  async function playVoice(text?: string) {
    const spokenText = (text ?? latestAssistant?.text ?? '').trim().slice(0, 600)
    if (!spokenText || !selectedVoice?.verified || speaking) return
    setSpeaking(true)
    setVoiceStatus(`Generating ${selectedVoice.label}…`)
    try {
      audioRef.current?.pause()
      if (audioRef.current?.src) URL.revokeObjectURL(audioRef.current.src)
      const res = await fetch('/api/admin/voice/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: spokenText, voiceId: selectedVoice.id, emotionAware: false }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? `Voice preview failed with HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => {
        setSpeaking(false)
        setVoiceStatus('')
        URL.revokeObjectURL(url)
      }
      await audio.play()
      setVoiceStatus(`Playing ${selectedVoice.label}`)
    } catch (error) {
      setSpeaking(false)
      setVoiceStatus(error instanceof Error ? error.message : 'Voice preview failed')
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-5 sm:right-5">
      {open && (
        <section className={`mb-3 flex max-h-[calc(100vh-6rem)] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#06101f]/95 shadow-2xl shadow-cyan-950/50 backdrop-blur-xl ${expanded ? 'h-[760px] w-[min(560px,calc(100vw-2rem))]' : 'h-[min(680px,calc(100vh-6rem))] w-[min(430px,calc(100vw-2rem))]'}`}>
          <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-cyan-400/10 p-2"><Sparkles className="h-4 w-4 text-cyan-200" /></div>
              <div>
                <p className="text-sm font-bold text-white">Aiva</p>
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{streamStatus}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setExpanded((value) => !value)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"><Settings2 className="h-4 w-4" /></button>
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
          </header>

          <div className="grid grid-cols-2 gap-2 border-b border-white/10 p-3">
            <select value={capability} onChange={(event) => setCapability(event.target.value as Capability)} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-200 outline-none">
              <option value="chat">Chat</option>
              <option value="coding">Coding</option>
              <option value="reasoning">Reasoning</option>
              <option value="creative">Creative</option>
              <option value="research">Research</option>
            </select>
            <select value={costPreference} onChange={(event) => setCostPreference(event.target.value as CostPreference)} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-200 outline-none">
              <option value="free_first">Free first</option>
              <option value="cheap">Cheap</option>
              <option value="balanced">Balanced</option>
              <option value="premium">Premium</option>
            </select>
            <select value={selectedVoiceId} onChange={(event) => setSelectedVoiceId(event.target.value)} className="col-span-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-200 outline-none">
              <option value="">Voice locked until TTS is verified</option>
              {voices.map((voice) => (
                <option key={voice.id} value={voice.id} disabled={!voice.verified}>
                  {voice.verified ? '✓' : ' locked'} {voice.label} — {voice.provider}/{voice.model}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {assistantText.length === 0 && <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-500">Ask Aiva to plan, explain, audit, or help operate the current app. Repo changes still belong in Repo Workbench.</p>}
            {assistantText.map((message, index) => (
              <div key={index} className={`rounded-2xl px-3 py-2 text-sm ${message.role === 'user' ? 'ml-4 bg-cyan-400/10 text-cyan-50 sm:ml-8' : 'mr-4 border border-white/10 bg-white/[0.04] text-slate-200 sm:mr-8'}`}>
                <p className="whitespace-pre-wrap">{message.text || (message.meta === 'streaming' ? '…' : '')}</p>
                {message.role === 'assistant' && message.text.trim() && selectedVoice?.verified && (
                  <button onClick={() => playVoice(message.text)} disabled={speaking} className="mt-2 inline-flex items-center gap-1 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[11px] font-semibold text-cyan-100 disabled:opacity-40">
                    {speaking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />} Play voice
                  </button>
                )}
              </div>
            ))}
          </div>

          <footer className="border-t border-white/10 p-3">
            <button onClick={() => setShowRoute((value) => !value)} className="mb-1 flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[10px] text-slate-400 hover:text-cyan-200">
              <span>Route details</span>{showRoute ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {showRoute && <p className="mb-2 rounded-xl border border-cyan-400/10 bg-cyan-400/[0.04] p-2 text-[10px] text-cyan-100">{routeMeta}</p>}
            {voiceStatus && <p className="mb-1 truncate text-[10px] text-cyan-300">Voice: {voiceStatus}</p>}
            {verifiedVoices.length === 0 && <p className="mb-1 truncate text-[10px] text-amber-300">Voice playback locked until a TTS provider passes runtime truth.</p>}
            <div className="flex gap-2">
              <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send() } }} rows={2} placeholder="Ask Aiva…" className="min-h-[44px] flex-1 resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40" />
              {busy || speaking ? (
                <button onClick={stop} className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 text-xs font-semibold text-red-200">Stop</button>
              ) : (
                <button onClick={send} disabled={!input.trim()} className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 text-cyan-100 disabled:opacity-40"><Send className="h-4 w-4" /></button>
              )}
            </div>
          </footer>
        </section>
      )}

      <button onClick={() => setOpen((value) => !value)} className="flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 shadow-xl shadow-cyan-950/40 backdrop-blur-xl hover:bg-cyan-400/20">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : speaking ? <Volume2 className="h-4 w-4" /> : open ? <MessageSquare className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        AI Assistant
      </button>
    </div>
  )
}
