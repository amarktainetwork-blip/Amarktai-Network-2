'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Film, RefreshCw, Image as ImageIcon, Video, Mic, Music, Shield, Clock, AlertTriangle, Download } from 'lucide-react'

type TabId = 'images' | 'video' | 'voice' | 'music' | 'avatar' | 'music-video' | 'asset-mixer' | 'history'

const TABS: { id: TabId; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }[] = [
  { id: 'images',      label: 'Images',        icon: ImageIcon },
  { id: 'video',       label: 'Video',         icon: Video     },
  { id: 'voice',       label: 'Voice',         icon: Mic       },
  { id: 'music',       label: 'Music',         icon: Music     },
  { id: 'avatar',      label: 'Avatar',        icon: Film      },
  { id: 'music-video', label: 'Music Video',   icon: Film      },
  { id: 'asset-mixer', label: 'Asset Mixer',   icon: Film      },
  { id: 'history',     label: 'History',       icon: Clock     },
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

type MediaModel = {
  id: string
  label: string
  provider: string
  category?: 'image' | 'video' | 'voice' | 'music'
  available: boolean
  blocker: string | null
}

interface MediaModels {
  genx?: { configured?: boolean; available?: boolean; modelCount?: number; blocker?: string | null }
  image: MediaModel[]
  video: MediaModel[]
  voice: MediaModel[]
  music: MediaModel[]
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

export default function CreativeStudioPage() {
  const [tab, setTab] = useState<TabId>('images')
  const [genx, setGenx] = useState<GenxStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [models, setModels] = useState<MediaModels | null>(null)

  // Image generation state
  const [imagePrompt, setImagePrompt] = useState('')
  const [imageModel, setImageModel] = useState('gpt-image-2')
  const [imageRunning, setImageRunning] = useState(false)
  const [imageResult, setImageResult] = useState<{ url?: string; error?: string; provider?: string; model?: string } | null>(null)

  // Video state
  const [videoPrompt, setVideoPrompt] = useState('')

  // Voice state
  const [voiceText, setVoiceText] = useState('')
  const [voiceModel, setVoiceModel] = useState('aura-2-asteria-en')
  const [voiceProvider, setVoiceProvider] = useState<'groq' | 'openai' | 'gemini' | 'auto'>('auto')
  const [voiceSpeed, setVoiceSpeed] = useState(1.0)
  const [voiceMode, setVoiceMode] = useState<'batch' | 'streaming'>('batch')
  const [voiceRunning, setVoiceRunning] = useState(false)
  const [voiceResult, setVoiceResult] = useState<{ url?: string; error?: string } | null>(null)

  // Music state
  const [musicPrompt, setMusicPrompt] = useState('')

  const loadGenx = useCallback(async () => {
    const [genxRes, modelsRes] = await Promise.all([
      fetch('/api/admin/genx/status').catch(() => null),
      fetch('/api/admin/media-studio/models').catch(() => null),
    ])
    if (genxRes?.ok) setGenx(await genxRes.json())
    if (modelsRes?.ok) {
      const data = await modelsRes.json()
      setModels(data)
      const firstImage = data?.image?.find((model: MediaModel) => model.available)?.id ?? data?.image?.[0]?.id
      if (firstImage) setImageModel(firstImage)
    }
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
    if (!imagePrompt.trim()) return
    setImageRunning(true)
    setImageResult(null)
    try {
      const res = await fetch('/api/brain/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imagePrompt, model: imageModel }),
      })
      const d = await res.json()
      const url = d.imageUrl ?? d.imageBase64 ?? d.url
      if (res.ok && d.executed && url) {
        setImageResult({ url, provider: d.provider, model: d.model ?? imageModel })
        await fetch('/api/admin/artifacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appSlug: 'media-studio',
            type: 'image',
            subType: 'generation',
            title: imagePrompt.slice(0, 80) || 'Generated image',
            description: imagePrompt,
            provider: d.provider,
            model: d.model ?? imageModel,
            contentUrl: url,
            metadata: { route: '/api/brain/image', prompt: imagePrompt },
          }),
        }).catch(() => null)
      } else setImageResult({ error: d.error ?? d.blocker ?? 'Generation failed' })
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
          <h1 className="text-2xl font-bold text-white">Creative Studio</h1>
        </div>
        <p className="text-sm text-slate-400">
          Generate media through the live runtime truth layer. Unverified video, music, and adult flows stay disabled until providers pass.
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
              Uses the production image route. If no real provider is configured, the backend returns a setup blocker instead of fake output.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Model</label>
                <select
                  value={imageModel}
                  onChange={e => setImageModel(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/40"
                >
                  {(models?.image?.length ? models.image : [
                    { id: 'gpt-image-2', label: 'GPT Image 2', provider: 'GenX', available: genxReady, blocker: null },
                    { id: 'grok-imagine', label: 'Grok Imagine', provider: 'GenX', available: genxReady, blocker: null },
                  ]).map((model) => (
                    <option key={model.id} value={model.id} disabled={!model.available}>
                      {model.label} ({model.provider}){model.available ? '' : ' - unavailable'}
                    </option>
                  ))}
                </select>
                {models?.genx?.blocker && <p className="mt-1 text-[11px] text-amber-400">{models.genx.blocker}</p>}
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
                disabled={imageRunning || !imagePrompt.trim()}
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
                    {(imageResult.provider || imageResult.model) && (
                      <p className="text-xs text-slate-500">Generated by {imageResult.provider ?? 'provider'}{imageResult.model ? ` / ${imageResult.model}` : ''}</p>
                    )}
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
              Video must run as an async job with submit, polling, and artifact persistence. It stays disabled unless live video models are confirmed.
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
            <div>
              <label className="block text-xs text-slate-400 mb-1">Available video models</label>
              <select disabled className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-sm text-slate-500">
                {(models?.video?.length ? models.video : []).map((model) => (
                  <option key={model.id}>{model.label} ({model.provider}){model.available ? '' : ' - disabled'}</option>
                ))}
                {!models?.video?.length && <option>No live video model confirmed</option>}
              </select>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-400">
              Video generation is disabled until a real render provider, quota check, polling, and artifact flow are verified.
            </div>
            <button
              disabled
              title="Video generation disabled until verified"
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
            {/* Mode status banner */}
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs text-cyan-300">
              <strong>Batch TTS:</strong> Ready — routes to /api/brain/tts (Groq, OpenAI, Gemini, HuggingFace).
              &nbsp;|&nbsp;
              <strong>Streaming TTS:</strong> Pending — requires REALTIME_SERVICE_URL to be set and realtime service running.
              Streaming is <span className="text-amber-400">not yet available</span>. No fake streaming.
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Provider</label>
                <select
                  value={voiceProvider}
                  onChange={e => setVoiceProvider(e.target.value as typeof voiceProvider)}
                  className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/40"
                >
                  <option value="auto">Auto (Groq → OpenAI → HuggingFace)</option>
                  <option value="groq">Groq TTS (fast, low-cost)</option>
                  <option value="openai">OpenAI TTS (premium)</option>
                  <option value="gemini">Gemini TTS (multimodal)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Voice / Model</label>
                <select
                  value={voiceModel}
                  onChange={e => setVoiceModel(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/40"
                >
                  {(models?.voice?.length ? models.voice : [
                    { id: 'grok-tts', label: 'Grok TTS', provider: 'GenX', available: genxReady, blocker: null },
                    { id: 'aura-2', label: 'Aura 2', provider: 'GenX', available: genxReady, blocker: null },
                    { id: 'genxlm-voice-v1', label: 'GenX Voice v1', provider: 'GenX', available: genxReady, blocker: null },
                  ]).map((model) => (
                    <option key={model.id} value={model.id} disabled={!model.available}>
                      {model.label} ({model.provider}){model.available ? '' : ' - unavailable'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Mode</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setVoiceMode('batch')}
                    className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition ${voiceMode === 'batch' ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' : 'border-white/10 text-slate-400 hover:text-white'}`}
                  >
                    Batch TTS ✓
                  </button>
                  <button
                    disabled
                    title="Streaming TTS requires realtime service"
                    className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-600 cursor-not-allowed opacity-50"
                  >
                    Streaming (pending)
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Speed ({voiceSpeed.toFixed(1)}x)</label>
                <input
                  type="range" min={0.5} max={2.0} step={0.1}
                  value={voiceSpeed}
                  onChange={e => setVoiceSpeed(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>
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
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  if (!voiceText.trim() || voiceRunning) return
                  setVoiceRunning(true)
                  setVoiceResult(null)
                  try {
                    const res = await fetch('/api/brain/tts', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        text: voiceText,
                        voiceId: voiceModel,
                        provider: voiceProvider,
                        speed: voiceSpeed,
                      }),
                    })
                    if (!res.ok) {
                      const d = await res.json().catch(() => ({}))
                      setVoiceResult({ error: d.error ?? d.blocker ?? `TTS failed (${res.status})` })
                    } else {
                      const blob = await res.blob()
                      const url = URL.createObjectURL(blob)
                      setVoiceResult({ url })
                    }
                  } catch (e) {
                    setVoiceResult({ error: String(e) })
                  } finally {
                    setVoiceRunning(false)
                  }
                }}
                disabled={!voiceText.trim() || voiceRunning}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-sm text-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cyan-500/20 transition-colors"
              >
                {voiceRunning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
                {voiceRunning ? 'Generating…' : 'Generate Batch TTS'}
              </button>
            </div>
            {voiceResult && (
              <div className="mt-2">
                {voiceResult.error
                  ? <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">{voiceResult.error}</div>
                  : voiceResult.url
                    ? <audio controls src={voiceResult.url} className="w-full mt-1" />
                    : null}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Music */}
      {tab === 'music' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white">Music Generation</h2>
            <p className="text-xs text-slate-400">
              Music generation is disabled tonight until a real audio provider, job polling, and artifact flow are verified.
            </p>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Available music/audio models</label>
              <select disabled className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-sm text-slate-500">
                {(models?.music?.length ? models.music : []).map((model) => (
                  <option key={model.id}>{model.label} ({model.provider}){model.available ? '' : ' - disabled'}</option>
                ))}
                {!models?.music?.length && <option>No live music model confirmed</option>}
              </select>
            </div>
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
              No fake audio generation is exposed from this page.
            </div>
            <button
              disabled
              title="Music generation disabled until verified"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-sm text-cyan-400 opacity-40 cursor-not-allowed"
            >
              <Music className="h-4 w-4" />
              Generate Music — configure provider first
            </button>
          </div>
        </div>
      )}

      {/* Talking Avatar */}
      {tab === 'avatar' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white">Talking Avatar</h2>
            <p className="text-xs text-slate-400">
              Generates a lip-synced talking avatar from an image and audio input. Requires a provider that supports avatar synthesis.
            </p>
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs text-cyan-300">
              <span className="font-semibold">Status: Ready to wire</span> — avatar synthesis endpoint not yet configured. Providers: Replicate, D-ID, or HeyGen via custom route.
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Avatar image</label>
                <input disabled type="file" className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-xs text-slate-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Audio input (speech to animate)</label>
                <input disabled type="file" className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-xs text-slate-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Or text (will generate voice first)</label>
                <textarea disabled rows={2} placeholder="Enter the text AmarktAI Assistant should speak as the avatar…" className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-xs text-slate-500 resize-none cursor-not-allowed" />
              </div>
            </div>
            <button disabled className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-sm text-cyan-400 opacity-40 cursor-not-allowed">
              <Film className="h-4 w-4" />
              Generate Avatar — configure provider first
            </button>
          </div>
        </div>
      )}

      {/* Music Video Builder */}
      {tab === 'music-video' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white">Music Video Builder</h2>
            <p className="text-xs text-slate-400">
              Assembles a music video from an audio track and image/video clips. Combines music generation with video generation.
            </p>
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs text-cyan-300">
              <span className="font-semibold">Status: Ready to wire</span> — requires both music generation and video generation endpoints to be confirmed.
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Audio / music track</label>
                <input disabled type="file" className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-xs text-slate-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Visual style / prompt</label>
                <textarea disabled rows={3} placeholder="Abstract neon cityscape, dynamic camera motion, synced to beat…" className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-xs text-slate-500 resize-none cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Duration</label>
                <select disabled className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-xs text-slate-500 cursor-not-allowed">
                  <option>15 seconds</option>
                  <option>30 seconds</option>
                  <option>60 seconds</option>
                </select>
              </div>
            </div>
            <button disabled className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-sm text-cyan-400 opacity-40 cursor-not-allowed">
              <Film className="h-4 w-4" />
              Build Music Video — configure providers first
            </button>
          </div>
        </div>
      )}

      {/* Asset Mixer */}
      {tab === 'asset-mixer' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-white">Asset Mixer</h2>
              <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-400">Ready to wire</span>
            </div>
            <p className="text-xs text-slate-400">
              Combine outputs from multiple AIs to discover new creative workflows. Compare results, save artifacts, and reuse assets across apps.
            </p>

            {/* Multi-AI workflow templates */}
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Multi-AI Workflow Templates</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { label: 'text → image → video', status: 'Ready to wire' },
                  { label: 'lyrics → voice/music → video', status: 'Ready to wire' },
                  { label: 'image → avatar → voice', status: 'Ready to wire' },
                  { label: 'research → script → media pack', status: 'Ready to wire' },
                  { label: 'app idea → brand assets → landing copy', status: 'Ready to wire' },
                  { label: 'multiple model comparison', status: 'Ready to wire' },
                  { label: 'multi-AI experiment board', status: 'Ready to wire' },
                ].map(({ label, status }) => (
                  <div key={label} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                    <span className="text-xs text-slate-400">{label}</span>
                    <span className="ml-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-400 shrink-0">{status}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Select assets from library</label>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-xs text-slate-500">
                  No assets loaded — connect to Artifacts library first.
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Mix operation</label>
                <select disabled className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-xs text-slate-500 cursor-not-allowed">
                  <option>Overlay image on video</option>
                  <option>Combine audio tracks</option>
                  <option>Trim and splice clips</option>
                  <option>Add subtitles / captions</option>
                  <option>Apply filter / style transfer</option>
                </select>
              </div>
            </div>
            <button disabled className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-sm text-cyan-400 opacity-40 cursor-not-allowed">
              <Film className="h-4 w-4" />
              Mix Assets — backend pending
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
