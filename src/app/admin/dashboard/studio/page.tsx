'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Bot,
  FileText,
  GitPullRequest,
  Image as ImageIcon,
  Loader2,
  Mic,
  Music,
  Sparkles,
  Upload,
  UserRound,
  Video,
  Volume2,
} from 'lucide-react'
import { APPROVED_AI_PROVIDERS, providerLabel } from '@/lib/approved-ai-catalog'
import type { UniversalModelCatalog } from '@/lib/universal-model-catalog'

type CapabilityId =
  | 'chat'
  | 'research'
  | 'image_generation'
  | 'music_generation'
  | 'video_generation'
  | 'avatar_video'
  | 'tts'
  | 'stt'
  | 'coding'

type StudioTab =
  | 'Chat'
  | 'Research'
  | 'Image'
  | 'Music / Audio'
  | 'Video'
  | 'Avatar / Talking Video'
  | 'Voice / TTS'
  | 'STT / Transcription'
  | 'Coding'

type Mode = {
  id: CapabilityId
  label: string
  short: string
  tab: StudioTab
  icon: typeof Sparkles
  placeholder: string
  action: string
}

type ArtifactSummary = {
  id: string
  title?: string
  type?: string
  subType?: string
  provider?: string
  model?: string
  storageUrl?: string
  contentUrl?: string
  url?: string
  createdAt?: string
  metadata?: Record<string, unknown>
}

type ApiResult = Record<string, unknown> & {
  success?: boolean
  error?: string
  blocker?: string
  transcript?: string
  storageUrl?: string
  imageUrl?: string
  audioUrl?: string
  videoUrl?: string
  mediaUrl?: string
  pollUrl?: string
  jobStatus?: string
  status?: string
  artifactId?: string
  artifact?: { id?: string; storageUrl?: string }
  result?: Record<string, unknown>
  workbenchUrl?: string
}

const MODES: Mode[] = [
  {
    id: 'chat',
    label: 'Chat',
    short: 'Chat',
    tab: 'Chat',
    icon: Bot,
    placeholder: 'Ask AmarktAI anything or describe what you want done.',
    action: 'Send',
  },
  {
    id: 'research',
    label: 'Research',
    short: 'Research',
    tab: 'Research',
    icon: FileText,
    placeholder: 'Research a topic, market, app idea, competitor, or technical question.',
    action: 'Research',
  },
  {
    id: 'image_generation',
    label: 'Image',
    short: 'Image',
    tab: 'Image',
    icon: ImageIcon,
    placeholder: 'Describe the image you want to generate.',
    action: 'Generate image',
  },
  {
    id: 'music_generation',
    label: 'Music',
    short: 'Music',
    tab: 'Music / Audio',
    icon: Music,
    placeholder: 'Describe the song, genre, mood, vocals, lyrics, and duration.',
    action: 'Create song',
  },
  {
    id: 'video_generation',
    label: 'Video',
    short: 'Video',
    tab: 'Video',
    icon: Video,
    placeholder: 'Describe the video scene, style, length, and format.',
    action: 'Generate video',
  },
  {
    id: 'avatar_video',
    label: 'Avatar',
    short: 'Avatar',
    tab: 'Avatar / Talking Video',
    icon: UserRound,
    placeholder: 'Write the script for the talking avatar or presenter video.',
    action: 'Create avatar',
  },
  {
    id: 'tts',
    label: 'Voice',
    short: 'Voice',
    tab: 'Voice / TTS',
    icon: Volume2,
    placeholder: 'Enter text to turn into spoken audio.',
    action: 'Create voice',
  },
  {
    id: 'stt',
    label: 'Transcribe',
    short: 'STT',
    tab: 'STT / Transcription',
    icon: Mic,
    placeholder: 'Upload audio or video to transcribe.',
    action: 'Transcribe',
  },
  {
    id: 'coding',
    label: 'Code',
    short: 'Code',
    tab: 'Coding',
    icon: GitPullRequest,
    placeholder: 'Describe the repo change or fix. This will hand off to Repo Workbench.',
    action: 'Send to Workbench',
  },
]

const MUSIC_GENRES = ['pop', 'rock', 'rnb', 'reggae/rasta', 'hip hop', 'amapiano', 'afrobeat', 'cinematic', 'edm', 'acoustic'] as const
const VOICE_TYPES = ['female', 'male', 'narrator', 'calm', 'deep', 'emotional', 'cinematic'] as const

export default function StudioPage() {
  const [modeId, setModeId] = useState<CapabilityId>('chat')
  const mode = MODES.find((item) => item.id === modeId) ?? MODES[0]

  const [catalog, setCatalog] = useState<UniversalModelCatalog | null>(null)
  const [provider, setProvider] = useState('auto')
  const [modelId, setModelId] = useState('auto')
  const [prompt, setPrompt] = useState('')
  const [status, setStatus] = useState('Ready')
  const [jobStatus, setJobStatus] = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<ApiResult | null>(null)
  const [, setArtifacts] = useState<ArtifactSummary[]>([])
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const [mediaSize, setMediaSize] = useState('1024x1024')
  const [musicGenre, setMusicGenre] = useState('pop')
  const [musicVocals, setMusicVocals] = useState('female')
  const [musicTempo, setMusicTempo] = useState('medium')
  const [musicMood, setMusicMood] = useState('')
  const [voiceType, setVoiceType] = useState('female')
  const [duration, setDuration] = useState('12')
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [avatarStyle, setAvatarStyle] = useState('professional presenter')

  const appSlug = 'amarktai-network'

  useEffect(() => {
    fetch('/api/admin/ai-model-catalog', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => setCatalog(data?.universal ?? null))
      .catch(() => setCatalog(null))
  }, [])

  const loadArtifacts = useCallback(async () => {
    const response = await fetch(`/api/admin/artifacts?appSlug=${encodeURIComponent(appSlug)}&limit=12`, { cache: 'no-store' })
    const data = await response.json().catch(() => ({}))
    setArtifacts(Array.isArray(data.artifacts) ? data.artifacts : [])
  }, [])

  useEffect(() => {
    loadArtifacts().catch(() => null)
  }, [loadArtifacts])

  const modelOptions = useMemo(() => {
    if (!catalog) return []

    const allModels = catalog.models ?? []
    const grouped = catalog.grouped as Record<string, typeof allModels>

    if (mode.id === 'image_generation') return grouped.image ?? allModels
    if (mode.id === 'video_generation' || mode.id === 'avatar_video') return grouped.video ?? allModels
    if (mode.id === 'music_generation' || mode.id === 'tts' || mode.id === 'stt') {
      return grouped.music ?? grouped.tts ?? grouped.stt ?? grouped.audio_generation ?? allModels
    }
    if (mode.id === 'coding') return grouped.coding ?? grouped.code_generation ?? allModels
    return allModels
  }, [catalog, mode.id])

  const selectedModel = modelOptions.find((item: (typeof modelOptions)[number]) => item.modelId === modelId)
  const executionProvider = selectedModel?.provider ?? provider
  const executionModel = selectedModel?.modelId && selectedModel.modelId !== 'auto' ? selectedModel.modelId : modelId !== 'auto' ? modelId : undefined

  async function run() {
    setResult(null)
    setJobStatus('')
    setStatus('Running')
    setRunning(true)

    try {
      if (mode.id === 'stt') {
        await runTranscription()
        return
      }

      if (!prompt.trim()) {
        setStatus('Enter a request first')
        return
      }

      if (mode.id === 'chat') {
        await runChat()
        return
      }

      const endpoint = mode.id === 'coding' ? '/api/admin/studio/workbench-handoff' : '/api/admin/studio/execute'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tab: mode.tab,
          prompt,
          appSlug,
          provider,
          model: executionModel,
          providerOverride: executionProvider,
          costMode: 'balanced',
          size: mediaSize,
          genre: musicGenre,
          genres: [musicGenre],
          vocalStyle: musicVocals,
          instrumental: musicVocals === 'instrumental',
          tempo: musicTempo,
          mood: musicMood,
          language: 'english',
          duration: Number(duration) || 12,
          aspectRatio,
          voiceId: voiceType,
          voiceType,
          avatarStyle,
        }),
      })

      const data = await response.json().catch(() => ({})) as ApiResult
      if (!response.ok || data.success === false) {
        throw new Error(String(data.error ?? data.blocker ?? data.result?.error ?? 'Playground request failed'))
      }

      let effective = data
      const pollUrl = typeof data.pollUrl === 'string'
        ? data.pollUrl
        : typeof data.result?.pollUrl === 'string'
          ? data.result.pollUrl
          : ''

      if (pollUrl) {
        setJobStatus(String(data.jobStatus ?? data.status ?? 'processing'))
        const finalJob = await pollJob(pollUrl)
        if (finalJob) effective = finalJob
      }

      setResult(effective)
      setStatus(statusMessage(effective))
      setJobStatus(String(effective.jobStatus ?? effective.status ?? 'completed'))
      await loadArtifacts()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Playground request failed'
      setStatus(message)
      setJobStatus('failed')
      setResult({ success: false, error: message, blocker: message })
    } finally {
      setRunning(false)
    }
  }

  async function runChat() {
    const response = await fetch('/api/admin/amarktai-assistant/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: prompt,
        prompt,
        appSlug,
        providerOverride: executionProvider,
        modelOverride: executionModel,
        capability: 'chat',
        metadata: { appSlug, dashboardContext: true, studioTab: mode.tab },
      }),
    })

    const data = await response.json().catch(() => ({})) as ApiResult
    if (!response.ok || data.success === false) throw new Error(String(data.error ?? data.blocker ?? 'Chat failed'))

    setResult(data)
    setStatus('Chat response ready')
    setJobStatus('completed')
  }

  async function runTranscription() {
    if (!uploadFile) {
      setStatus('Choose an audio or video file first')
      return
    }

    const form = new FormData()
    form.append('file', uploadFile)
    form.append('appSlug', appSlug)
    form.append('provider', executionProvider)
    if (executionModel) form.append('model', executionModel)

    const response = await fetch('/api/admin/studio/stt', { method: 'POST', body: form })
    const data = await response.json().catch(() => ({})) as ApiResult

    if (!response.ok || data.success === false) throw new Error(String(data.error ?? data.result?.error ?? 'Transcription failed'))

    setResult(data)
    setStatus(data.artifact?.id ? `Transcript saved: ${data.artifact.id}` : 'Transcript ready')
    setJobStatus('completed')
    await loadArtifacts()
  }

  async function pollJob(pollUrl: string) {
    let latest: ApiResult | null = null

    for (let i = 0; i < 18; i += 1) {
      const response = await fetch(pollUrl, { cache: 'no-store' }).catch(() => null)
      const data = await response?.json().catch(() => null) as ApiResult | null
      if (data) {
        latest = data
        const state = String(data.status ?? data.jobStatus ?? data.result?.status ?? 'processing')
        setJobStatus(state)
        if (['completed', 'succeeded', 'failed', 'blocked'].includes(state)) break
      }
      await new Promise((resolve) => window.setTimeout(resolve, 2000))
    }

    await loadArtifacts().catch(() => null)
    return latest
  }

  const canRun = mode.id === 'stt' ? Boolean(uploadFile) : Boolean(prompt.trim())

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-[rgba(5,10,18,.64)] p-5 backdrop-blur-xl">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Playground</p>
            <h1 className="mt-2 text-2xl font-black tracking-[-0.03em] text-white md:text-3xl">Create with AmarktAI.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Choose a capability, enter the request, run it, then review the artifact in Outputs.
            </p>
          </div>
          <Link href="/admin/dashboard/outputs" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-3 text-xs font-black text-slate-200 hover:bg-white/10">
            Open Outputs <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Panel title="Choose capability">
            <div className="grid grid-cols-3 gap-2">
              {MODES.map((item) => {
                const active = item.id === mode.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setModeId(item.id)
                      setResult(null)
                      setStatus('Ready')
                      setJobStatus('')
                    }}
                    className={[
                      'rounded-xl border p-3 text-left transition',
                      active
                        ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100'
                        : 'border-white/10 bg-white/[0.035] text-slate-400 hover:bg-white/[0.06] hover:text-white',
                    ].join(' ')}
                  >
                    <item.icon className="h-4 w-4" />
                    <p className="mt-2 text-[11px] font-black">{item.short}</p>
                  </button>
                )
              })}
            </div>
          </Panel>

          <button
            type="button"
            onClick={() => setAdvancedOpen((open) => !open)}
            className="flex h-11 w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.035] px-3 text-xs font-black text-slate-300 transition hover:border-cyan-300/25 hover:bg-white/[0.06] hover:text-white"
          >
            <span>Advanced routing</span>
            <span className="text-cyan-200">{advancedOpen ? 'Hide' : 'Auto'}</span>
          </button>

          {advancedOpen && (
            <Panel title="Advanced routing">
              <div className="grid gap-3">
                <label className="grid gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Provider</span>
                  <select value={provider} onChange={(event) => setProvider(event.target.value)} className="dark-select">
                    <option value="auto">Auto route</option>
                    {APPROVED_AI_PROVIDERS.map((item) => <option key={item.key} value={item.key}>{item.displayName}</option>)}
                  </select>
                </label>

                <label className="grid gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Model</span>
                  <select value={modelId} onChange={(event) => setModelId(event.target.value)} className="dark-select">
                    <option value="auto">Auto model</option>
                    {modelOptions.map((item: (typeof modelOptions)[number]) => (
                      <option key={item.modelId} value={item.modelId}>{providerLabel(item.provider)} · {item.displayName ?? item.modelId}</option>
                    ))}
                  </select>
                </label>
              </div>
            </Panel>
          )}
        </div>

        <div className="space-y-4">
          <Panel title={mode.label}>
            {mode.id === 'stt' ? (
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-white/15 bg-slate-950/45 p-4 text-sm font-bold text-slate-300 hover:border-cyan-300/30">
                <span className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-cyan-200" />
                  {uploadFile?.name ?? 'Choose audio or video file'}
                </span>
                <input type="file" accept="audio/*,video/*" className="hidden" onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)} />
              </label>
            ) : (
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={mode.placeholder}
                className="min-h-[150px] w-full resize-y rounded-2xl border border-white/10 bg-slate-950/55 p-4 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/30"
              />
            )}

            <ModeControls
              mode={mode}
              mediaSize={mediaSize}
              setMediaSize={setMediaSize}
              musicGenre={musicGenre}
              setMusicGenre={setMusicGenre}
              musicVocals={musicVocals}
              setMusicVocals={setMusicVocals}
              musicTempo={musicTempo}
              setMusicTempo={setMusicTempo}
              musicMood={musicMood}
              setMusicMood={setMusicMood}
              voiceType={voiceType}
              setVoiceType={setVoiceType}
              duration={duration}
              setDuration={setDuration}
              aspectRatio={aspectRatio}
              setAspectRatio={setAspectRatio}
              avatarStyle={avatarStyle}
              setAvatarStyle={setAvatarStyle}
            />

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={run}
                disabled={!canRun || running}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {running ? 'Running' : mode.action}
              </button>
              <p className="text-xs font-bold text-slate-500">{status}</p>
            </div>
          </Panel>

          <Panel title="Result">
            <ResultPreview result={result} />
            <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
              <Fact label="Provider" value={providerLabel(String(result?.provider ?? executionProvider ?? 'auto'))} />
              <Fact label="Model" value={String(result?.model ?? executionModel ?? 'auto')} />
              <Fact label="Status" value={jobStatus || String(result?.status ?? result?.jobStatus ?? 'waiting')} />
            </div>
          </Panel>
        </div>
      </section>

    </div>
  )
}

function ModeControls(props: {
  mode: Mode
  mediaSize: string
  setMediaSize: (value: string) => void
  musicGenre: string
  setMusicGenre: (value: string) => void
  musicVocals: string
  setMusicVocals: (value: string) => void
  musicTempo: string
  setMusicTempo: (value: string) => void
  musicMood: string
  setMusicMood: (value: string) => void
  voiceType: string
  setVoiceType: (value: string) => void
  duration: string
  setDuration: (value: string) => void
  aspectRatio: string
  setAspectRatio: (value: string) => void
  avatarStyle: string
  setAvatarStyle: (value: string) => void
}) {
  if (props.mode.id === 'image_generation') {
    return (
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Select label="Size" value={props.mediaSize} onChange={props.setMediaSize} options={['1024x1024', '1024x1536', '1536x1024']} />
      </div>
    )
  }

  if (props.mode.id === 'music_generation') {
    return (
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select label="Genre" value={props.musicGenre} onChange={props.setMusicGenre} options={[...MUSIC_GENRES]} />
        <Select label="Vocals" value={props.musicVocals} onChange={props.setMusicVocals} options={['female', 'male', 'duet', 'instrumental']} />
        <Select label="Tempo" value={props.musicTempo} onChange={props.setMusicTempo} options={['slow', 'medium', 'fast']} />
        <TextInput label="Mood" value={props.musicMood} onChange={props.setMusicMood} placeholder="uplifting, emotional..." />
      </div>
    )
  }

  if (props.mode.id === 'video_generation') {
    return (
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Select label="Duration" value={props.duration} onChange={props.setDuration} options={['8', '12', '20', '30']} />
        <Select label="Aspect" value={props.aspectRatio} onChange={props.setAspectRatio} options={['16:9', '9:16', '1:1']} />
      </div>
    )
  }

  if (props.mode.id === 'avatar_video') {
    return (
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <TextInput label="Avatar style" value={props.avatarStyle} onChange={props.setAvatarStyle} placeholder="professional presenter" />
        <Select label="Voice" value={props.voiceType} onChange={props.setVoiceType} options={[...VOICE_TYPES]} />
      </div>
    )
  }

  if (props.mode.id === 'tts') {
    return (
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Select label="Voice" value={props.voiceType} onChange={props.setVoiceType} options={[...VOICE_TYPES]} />
      </div>
    )
  }

  return null
}

function ResultPreview({ result }: { result: ApiResult | null }) {
  if (!result) {
    return <p className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-500">Result appears here after a run.</p>
  }

  const url = resultUrl(result)
  const text = resultText(result)

  if (result.blocker || result.error) {
    return (
      <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-xs leading-5 text-amber-100">
        {String(result.blocker ?? result.error)}
      </pre>
    )
  }

  if (isImageUrl(url)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="Generated result" className="max-h-[420px] w-full rounded-2xl border border-white/10 object-contain" />
  }

  if (isAudioUrl(url)) {
    return <audio controls src={url} className="w-full" />
  }

  if (isVideoUrl(url)) {
    return <video controls src={url} className="max-h-[420px] w-full rounded-2xl border border-white/10 bg-black" />
  }

  if (url) {
    return <a href={url} className="inline-flex rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100">Open generated file</a>
  }

  return (
    <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-slate-950/55 p-4 text-xs leading-5 text-slate-300">
      {text || JSON.stringify(result, null, 2)}
    </pre>
  )
}

function resultUrl(result: ApiResult) {
  const nested = result.result ?? {}
  const artifact = result.artifact ?? {}

  for (const value of [
    result.storageUrl,
    result.mediaUrl,
    result.imageUrl,
    result.audioUrl,
    result.videoUrl,
    artifact.storageUrl,
    nested.storageUrl,
    nested.mediaUrl,
    nested.imageUrl,
    nested.audioUrl,
    nested.videoUrl,
  ]) {
    if (typeof value === 'string' && value) return value
  }

  return ''
}

function resultText(result: ApiResult) {
  const nested = result.result ?? {}

  for (const value of [
    result.transcript,
    nested.transcript,
    nested.text,
    nested.content,
    nested.answer,
    nested.message,
    result.workbenchUrl ? `Workbench handoff saved:\n${result.workbenchUrl}` : '',
  ]) {
    if (typeof value === 'string' && value.trim()) return value
  }

  return ''
}

function statusMessage(result: ApiResult) {
  if (result.artifactId) return `Artifact saved: ${result.artifactId}`
  if (result.pollUrl) return 'Job started'
  if (result.workbenchUrl) return 'Workbench handoff saved'
  if (result.storageUrl || result.mediaUrl || result.imageUrl || result.audioUrl || result.videoUrl) return 'Generated result ready'
  return 'Run complete'
}

function isImageUrl(url: string) {
  return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url) || url.startsWith('data:image/')
}

function isAudioUrl(url: string) {
  return /\.(mp3|mpeg|wav|ogg|m4a|aac)(\?|$)/i.test(url) || url.startsWith('data:audio/')
}

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) || url.startsWith('data:video/')
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[rgba(5,10,18,.62)] p-4 backdrop-blur-xl">
      <h2 className="text-sm font-black text-white">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="dark-select">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}

function TextInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="dark-input" />
    </label>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 truncate font-bold text-slate-300">{value}</p>
    </div>
  )
}
