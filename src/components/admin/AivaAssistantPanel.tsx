'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, Loader2, MessageSquare, Play, Send, Settings2, Sparkles, Volume2, X } from 'lucide-react'

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
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'system', text: 'Aiva is online when enabled. She streams through the admin conversation route and only reports actions proven by backend results.' },
  ])
  const [input, setInput] = useState('')
  const [costPreference, setCostPreference] = useState<CostPreference>('cheap')
  const [capability, setCapability] = useState<Capability>('chat')
  const [voices, setVoices] = useState<VoiceOption[]>([])
  const [selectedVoiceId, setSelectedVoiceId] = useState('')
  const [voiceStatus, setVoiceStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [routeMeta, setRouteMeta] = useState('')
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
    setRouteMeta('')
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
            if (item.event === 'token' && typeof data.text === 'string') {
              setMessages((current) => {
                const copy = [...current]
                const last = copy[copy.length - 1]
                if (last?.role === 'assistant') copy[copy.length - 1] = { ...last, text: `${last.text}${data.text}` }
                return copy
              })
            }
            if (item.event === 'route') {
              const selected = data.selected as { provider?: string; model?: string } | null | undefined
              if (selected?.provider || selected?.model) setRouteMeta(`${selected.provider ?? 'provider'} · ${selected.model ?? 'model'}`)
            }
            if (item.event === 'done') {
              setRouteMeta(`${String(data.provider ?? 'provider')} · ${String(data.model ?? 'model')}`)
            }
            if (item.event === 'error') {
              setMessages((current) => {
                const copy = [...current]
                const last = copy[copy.length - 1]
                const msg = typeof data.message === 'string' ? data.message : 'Aiva stream error'
                if (last?.role === 'assistant') copy[copy.length - 1] = { ...last, text: last.text ? `${last.text}\n\n${msg}` : msg, meta: 'error' }
                return copy
              })
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        setMessages((current) => {
          const copy = [...current]
          const last = copy[copy.length - 1]
          const msg = error instanceof Error ? error.message : 'Aiva failed'
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
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <section className={`mb-3 overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#06101f]/95 shadow-2xl shadow-cyan-950/50 backdrop-blur-xl ${expanded ? 'h-[760px] w-[560px]' : 'h-[620px] w-[400px]'} max-h-[calc(100vh-7rem)] max-w-[calc(100vw-2rem)]`}>
          <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-cyan-400/10 p-2"><Sparkles className="h-4 w-4 text-cyan-200" /></div>
              <div>
                <p className="text-sm font-bold text-white">Aiva</p>
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Streaming operator assistant</p>
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

          <div className="h-[calc(100%-208px)] space-y-3 overflow-y-auto p-4">
            {assistantText.length === 0 && <p className="text-sm text-slate-500">Ask Aiva to plan, explain, audit, or help operate the current app. Repo changes still belong in Repo Workbench.</p>}
            {assistantText.map((message, index) => (
              <div key={index} className={`rounded-2xl px-3 py-2 text-sm ${message.role === 'user' ? 'ml-8 bg-cyan-400/10 text-cyan-50' : 'mr-8 border border-white/10 bg-white/[0.04] text-slate-200'}`}>
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
            {routeMeta && <p className="mb-1 truncate text-[10px] text-slate-500">Route: {routeMeta}</p>}
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
        Aiva
      </button>
    </div>
  )
}
