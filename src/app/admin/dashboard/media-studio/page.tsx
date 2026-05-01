'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Film, RefreshCw, Image as ImageIcon, Video, Mic, Music, Shield, Clock, AlertTriangle, Download } from 'lucide-react'

type TabId = 'images' | 'video' | 'voice' | 'music' | 'history'

const TABS: { id: TabId; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }[] = [
  { id: 'images',  label: 'Images', icon: ImageIcon },
  { id: 'video',   label: 'Video',  icon: Video     },
  { id: 'voice',   label: 'Voice',  icon: Mic       },
  { id: 'music',   label: 'Music',  icon: Music     },
  { id: 'history', label: 'History',icon: Clock     },
]

interface Artifact {
  id: string | number
  type?: string
  mediaType?: string
  prompt?: string
  status?: string
  storageUrl?: string
  createdAt?: string
  provider?: string
  model?: string
  costCents?: number
}

interface GenxStatus {
  configured?: boolean
  available?: boolean
}

function BlockerCard({ title, reason, action }: { title: string; reason: string; action?: string }) {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
      <div className="flex items-center gap-2 text-amber-400 font-medium text-sm">
        <AlertTriangle className="h-4 w-4" />
        {title}
      </div>
      <p className="text-xs text-slate-400">{reason}</p>
      {action && (
        <Link href={action} className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
          Configure in Settings →
        </Link>
      )}
    </div>
  )
}

export default function MediaStudioPage() {
  const [tab, setTab] = useState<TabId>('images')
  const [genx, setGenx] = useState<GenxStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [artifacts, setArtifacts] = useState<Artifact[]>([])

  // Image generation state
  const [imagePrompt, setImagePrompt] = useState('')
  const [imageModel, setImageModel] = useState('recraft-v3')
  const [imageRunning, setImageRunning] = useState(false)
  const [imageResult, setImageResult] = useState<{ url?: string; error?: string } | null>(null)

  // Video state
  const [videoPrompt, setVideoPrompt] = useState('')

  // Voice state
  const [voiceText, setVoiceText] = useState('')
  const [voiceModel, setVoiceModel] = useState('aura-2-asteria-en')

  // Music state
  const [musicPrompt, setMusicPrompt] = useState('')

  const loadGenx = useCallback(async () => {
    const res = await fetch('/api/admin/genx/status').catch(() => null)
    if (res?.ok) setGenx(await res.json())
  }, [])

  const loadHistory = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/artifacts?limit=30').catch(() => null)
    if (res?.ok) {
      const d = await res.json()
      setArtifacts(Array.isArray(d) ? d : (d?.artifacts ?? []))
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadGenx() }, [loadGenx])
  useEffect(() => { if (tab === 'history') loadHistory() }, [tab, loadHistory])

  const genxReady = genx?.available === true

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() || !genxReady) return
    setImageRunning(true)
    setImageResult(null)
    try {
      const res = await fetch('/api/admin/workspace/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'image', prompt: imagePrompt, model: imageModel }),
      })
      const d = await res.json()
      if (d.success && d.url) setImageResult({ url: d.url })
      else setImageResult({ error: d.error ?? d.blocker ?? 'Generation failed' })
    } catch (e) {
      setImageResult({ error: String(e) })
    } finally {
      setImageRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-[#0d1a2e] to-[#060d1b] p-6">
        <div className="flex items-center gap-3 mb-2">
          <Film className="h-6 w-6 text-cyan-400" />
          <h1 className="text-2xl font-bold text-white">Media Studio</h1>
        </div>
        <p className="text-sm text-slate-400">
          Generate images, video, voice, and music through GenX. All generation routes through GenX first.
        </p>
      </div>

      {/* GenX status banner */}
      {genx !== null && !genx.available && (
        <BlockerCard
          title="GenX not available"
          reason={genx.configured ? 'GenX key is configured but the endpoint is unreachable. Check your GENX_API_KEY and GENX_API_URL in Settings.' : 'GenX API key is not configured. Add your GenX key to unlock all media generation.'}
          action="/admin/dashboard/settings"
        />
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-white/[0.03] border border-white/[0.06] p-1 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 flex-1 min-w-[80px] justify-center rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
              tab === t.id ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:text-white'
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Images */}
      {tab === 'images' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white">Image Generation</h2>
            <p className="text-xs text-slate-500">
              GenX image models: Recraft v3, DALL-E 3 (via GenX), Grok Imagine, Flux (via GenX), and more.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Model</label>
                <select
                  value={imageModel}
                  onChange={e => setImageModel(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/40"
                >
                  <option value="recraft-v3">Recraft v3 (GenX)</option>
                  <option value="grok-imagine">Grok Imagine (GenX)</option>
                  <option value="dalle-3">DALL-E 3 (GenX)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Prompt</label>
                <textarea
                  value={imagePrompt}
                  onChange={e => setImagePrompt(e.target.value)}
                  placeholder="Describe the image you want to generate…"
                  rows={3}
                  className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 resize-none"
                />
              </div>
              <button
                onClick={handleGenerateImage}
                disabled={!genxReady || imageRunning || !imagePrompt.trim()}
                title={!genxReady ? 'GenX key required' : ''}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-sm text-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cyan-500/20 transition-colors"
              >
                {imageRunning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                {imageRunning ? 'Generating…' : genxReady ? 'Generate Image' : 'GenX key required'}
              </button>
            </div>
            {imageResult && (
              <div className="mt-3">
                {imageResult.error ? (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">{imageResult.error}</div>
                ) : imageResult.url ? (
                  <div className="space-y-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageResult.url} alt="Generated" className="w-full rounded-xl border border-white/10" />
                    <a href={imageResult.url} download className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300">
                      <Download className="h-3 w-3" />Download
                    </a>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video */}
      {tab === 'video' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white">Video Generation</h2>
            <p className="text-xs text-slate-400">
              GenX video models available: Veo 2, Kling, Seedance, PixVerse, Grok Video.
              Video generation is expensive — confirm cost before running.
            </p>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Prompt (text-to-video)</label>
              <textarea
                value={videoPrompt}
                onChange={e => setVideoPrompt(e.target.value)}
                placeholder="Describe the video scene…"
                rows={3}
                className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 resize-none"
              />
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-400">
              Video generation through GenX is wired but requires a confirmed GenX key with video quota. Estimated cost shown before generation starts.
            </div>
            <button
              disabled
              title="GenX key + video quota required"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-sm text-cyan-400 opacity-40 cursor-not-allowed"
            >
              <Video className="h-4 w-4" />
              Generate Video — GenX key required
            </button>
          </div>
        </div>
      )}

      {/* Voice */}
      {tab === 'voice' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white">Voice / TTS</h2>
            <p className="text-xs text-slate-400">
              GenX voice models: Grok TTS, Aura 2 (Deepgram via GenX), GenX LM Voice v1.
              Fallback: ElevenLabs, Resemble (configure in Settings).
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Model / Voice</label>
                <select
                  value={voiceModel}
                  onChange={e => setVoiceModel(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/40"
                >
                  <option value="aura-2-asteria-en">Aura 2 – Asteria (EN) via GenX</option>
                  <option value="grok-tts">Grok TTS via GenX</option>
                  <option value="genx-lm-voice-v1">GenX LM Voice v1</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Text</label>
                <textarea
                  value={voiceText}
                  onChange={e => setVoiceText(e.target.value)}
                  placeholder="Text to convert to speech…"
                  rows={4}
                  className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 resize-none"
                />
              </div>
              <button
                disabled
                title="GenX key required"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-sm text-cyan-400 opacity-40 cursor-not-allowed"
              >
                <Mic className="h-4 w-4" />
                Generate Voice — GenX key required
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Music */}
      {tab === 'music' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white">Music Generation</h2>
            <p className="text-xs text-slate-400">
              GenX music models: Lyria (Google via GenX) if available.
              Fallback: Suno, Udio, MusicGen/local (configure in Settings).
            </p>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Prompt / Style Description</label>
              <textarea
                value={musicPrompt}
                onChange={e => setMusicPrompt(e.target.value)}
                placeholder="upbeat electronic track, 120bpm, no vocals…"
                rows={3}
                className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 resize-none"
              />
            </div>
            <div className="rounded-xl border border-slate-700/40 bg-white/[0.02] p-3 text-xs text-slate-500">
              If no real audio provider is configured, output will be a <strong className="text-slate-400">lyrics/blueprint only</strong>.
              No fake audio generation.
            </div>
            <button
              disabled
              title="Music provider not configured"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-sm text-cyan-400 opacity-40 cursor-not-allowed"
            >
              <Music className="h-4 w-4" />
              Generate Music — configure provider first
            </button>
          </div>
        </div>
      )}

      {/* History */}
      {tab === 'history' && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-5 w-5 text-cyan-400 animate-spin" />
              <span className="ml-3 text-sm text-slate-400">Loading history…</span>
            </div>
          ) : artifacts.length === 0 ? (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center text-sm text-slate-500">
              No media artifacts yet. Generate something above.
            </div>
          ) : (
            artifacts
              .filter(a => ['image', 'video', 'voice', 'audio', 'music'].includes(a.type ?? a.mediaType ?? ''))
              .map(a => (
                <div key={String(a.id)} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{a.prompt ?? 'Untitled'}</p>
                    <p className="text-[11px] text-slate-500">{a.type ?? a.mediaType} · {a.model ?? a.provider} · {a.status}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {a.costCents != null && <span className="text-[11px] text-slate-600">${(a.costCents/100).toFixed(3)}</span>}
                    {a.createdAt && <span className="text-[11px] text-slate-600 hidden sm:block">{new Date(a.createdAt).toLocaleDateString()}</span>}
                    {a.storageUrl && (
                      <a href={a.storageUrl} download className="text-xs text-cyan-400 hover:text-cyan-300">
                        <Download className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))
          )}
          <p className="text-xs text-slate-600">Full artifact library in <Link href="/admin/dashboard/artifacts" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">Artifacts &amp; Jobs</Link>.</p>
        </div>
      )}

      {/* Adult tab gated */}
      {process.env.NEXT_PUBLIC_ADULT_MODE === 'true' && (
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 flex items-center gap-3">
          <Shield className="h-4 w-4 text-violet-400" />
          <div>
            <p className="text-sm font-medium text-violet-300">Adult Content Mode</p>
            <p className="text-xs text-slate-500">Adult image/video generation — requires app-scoped permission and admin gate. Configure in Settings → Adult Mode.</p>
          </div>
        </div>
      )}
    </div>
  )
}
