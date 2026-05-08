'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Brain, DatabaseZap, FolderInput, Loader2, Play, Save, Send, Sparkles } from 'lucide-react'
import { APPROVED_AI_PROVIDERS, type CostMode, providerLabel } from '@/lib/approved-ai-catalog'
import type { UniversalModelCatalog } from '@/lib/universal-model-catalog'
import { STUDIO_TABS, STUDIO_ROUTE_MAP, type StudioTab } from '@/lib/studio-route-map'

const studioTabs = STUDIO_TABS

const STUDIO_TAB_TRUTH: Record<StudioTab, { status: string; detail: string; chatEnabled: boolean }> = Object.fromEntries(
  STUDIO_TABS.map((item) => [item, {
    status: STUDIO_ROUTE_MAP[item].status === 'missing' ? 'Not implemented' : 'Available backend route',
    detail: STUDIO_ROUTE_MAP[item].detail,
    chatEnabled: item === 'Chat',
  }]),
) as Record<StudioTab, { status: string; detail: string; chatEnabled: boolean }>
type AssistantContext = {
  workbench?: Record<string, unknown>
  costs?: Record<string, unknown>
  voice?: Array<{ provider: string; label: string; status: string }>
  modelCatalog?: unknown[]
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

export default function StudioPage() {
  const [tab, setTab] = useState<StudioTab>('Chat')
  const [catalog, setCatalog] = useState<UniversalModelCatalog | null>(null)
  const [context, setContext] = useState<AssistantContext | null>(null)
  const [modelId, setModelId] = useState('auto')
  const [provider, setProvider] = useState('auto')
  const [costMode, setCostMode] = useState<CostMode>('balanced')
  const [voice, setVoice] = useState('minimax')
  const [appSlug] = useState('amarktai')
  const [adultPolicy, setAdultPolicy] = useState('full_adult_app_mode')
  const [message, setMessage] = useState('')
  const [conversation, setConversation] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [artifacts, setArtifacts] = useState<ArtifactSummary[]>([])
  const [audioPreview, setAudioPreview] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [adultMode, setAdultMode] = useState<'text' | 'image'>('text')
  const [mediaSize, setMediaSize] = useState('1024x1024')
  const [streaming, setStreaming] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [status, setStatus] = useState('')
  const [jobStatus, setJobStatus] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/ai-model-catalog').then((response) => response.json()).catch(() => null),
      fetch('/api/admin/amarktai-assistant/context').then((response) => response.json()).catch(() => null),
    ]).then(([modelData, contextData]) => {
      setCatalog(modelData?.universal ?? null)
      setContext(contextData ?? null)
    })
  }, [])

  const loadArtifacts = useCallback(async () => {
    const response = await fetch(`/api/admin/artifacts?appSlug=${encodeURIComponent(appSlug)}&limit=30`)
    const data = await response.json().catch(() => ({}))
    setArtifacts(Array.isArray(data.artifacts) ? data.artifacts as ArtifactSummary[] : [])
  }, [appSlug])

  useEffect(() => {
    if (tab === 'Artifacts') loadArtifacts().catch(() => null)
  }, [tab, loadArtifacts])

  const tabCapability = useMemo(() => capabilityForTab(tab), [tab])
  const tabTruth = STUDIO_TAB_TRUTH[tab]
  const modelOptions = useMemo(() => {
    if (!catalog) return []
    if (tab === 'Adult') return catalog.grouped.adult?.length ? catalog.grouped.adult : catalog.models.filter((model) => model.supportsAdult)
    return catalog.grouped[capabilityGroupForTab(tab)] ?? catalog.models
  }, [catalog, tab])

  const selectedModel = modelOptions.find((model) => model.modelId === modelId)

  async function sendMessage() {
    if (!message.trim() || !tabTruth.chatEnabled) return
    const nextUser = { role: 'user' as const, content: message }
    setConversation((current) => [...current, nextUser, { role: 'assistant', content: '' }])
    setMessage('')
    setStreaming(true)
    setStatus('Streaming')
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const response = await fetch('/api/admin/amarktai-assistant/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          capability: tabCapability,
          providerOverride: selectedModel?.provider ?? provider,
          modelOverride: selectedModel?.modelId === 'auto' ? undefined : selectedModel?.modelId,
          costMode,
          metadata: { appSlug, adultPolicy, dashboardContext: true, studioTab: tab },
        }),
        signal: controller.signal,
      })
      if (!response.ok || !response.body) throw new Error('Studio stream failed')
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data:')) continue
          const data = line.slice(5).trim()
          if (!data || data === '[DONE]') continue
          const parsed = JSON.parse(data) as { content?: string; status?: string }
          if (parsed.status) setStatus(parsed.status)
          if (parsed.content) {
            setConversation((current) => {
              const copy = [...current]
              const last = copy[copy.length - 1]
              if (last?.role === 'assistant') copy[copy.length - 1] = { ...last, content: `${last.content}${parsed.content}` }
              return copy
            })
          }
        }
      }
      setStatus('Saved to conversation memory')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Studio request failed')
    } finally {
      setStreaming(false)
    }
  }

  async function runStudioAction() {
    if (tab === 'Chat') return sendMessage()
    if (tab === 'Artifacts') return loadArtifacts()
    if (tab === 'Avatar / Talking Video') {
      setStatus(STUDIO_ROUTE_MAP[tab].detail)
      return
    }
    if (tab === 'STT / Transcription') return transcribeUpload()
    if (!message.trim()) return

    setExecuting(true)
    setAudioPreview('')
    setJobStatus('')
    setStatus('Running real backend route')
    try {
      const endpoint = tab === 'Coding' ? '/api/admin/studio/workbench-handoff' : '/api/admin/studio/execute'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tab,
          prompt: message,
          appSlug,
          provider: selectedModel?.provider ?? provider,
          model: selectedModel?.modelId === 'auto' ? undefined : selectedModel?.modelId ?? modelId,
          costMode,
          adultPolicy,
          mode: adultMode,
          voiceId: voice,
          size: mediaSize,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || data.success === false) throw new Error(data.error ?? data.result?.error ?? 'Studio execution failed')
      if (typeof data.audioBase64 === 'string') setAudioPreview(data.audioBase64)
      const pollUrl = typeof data.result?.pollUrl === 'string' ? data.result.pollUrl : ''
      if (pollUrl) {
        setJobStatus(String(data.result?.status ?? 'pending'))
        const finalJob = await pollStudioJob(pollUrl)
        if (finalJob?.status) setJobStatus(String(finalJob.status))
        if (finalJob && !extractResultUrl(finalJob) && String(finalJob.status) !== 'failed') setStatus('Job created, output pending')
      }
      setConversation((current) => [
        ...current,
        { role: 'user', content: message },
        { role: 'assistant', content: summarizeStudioResult(data) },
      ])
      setStatus(data.workbenchUrl ? 'Workbench handoff saved' : data.artifact?.id ? `Artifact saved: ${data.artifact.id}` : pollUrl ? 'Job created, output pending' : 'Backend executed')
      await loadArtifacts().catch(() => null)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Studio request failed')
    } finally {
      setExecuting(false)
    }
  }

  async function transcribeUpload() {
    if (!uploadFile) {
      setStatus('Select an audio file first')
      return
    }
    setExecuting(true)
    setStatus('Uploading to STT route')
    try {
      const form = new FormData()
      form.append('file', uploadFile)
      form.append('appSlug', appSlug)
      form.append('provider', selectedModel?.provider ?? provider)
      if (selectedModel?.modelId && selectedModel.modelId !== 'auto') form.append('model', selectedModel.modelId)
      const response = await fetch('/api/admin/studio/stt', { method: 'POST', body: form })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || data.success === false) throw new Error(data.error ?? data.result?.error ?? 'STT failed')
      setConversation((current) => [
        ...current,
        { role: 'user', content: `Transcribe: ${uploadFile.name}` },
        { role: 'assistant', content: String(data.result?.transcript ?? summarizeStudioResult(data)) },
      ])
      setStatus(data.artifact?.id ? `Transcript saved: ${data.artifact.id}` : 'Transcript returned')
      await loadArtifacts().catch(() => null)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'STT request failed')
    } finally {
      setExecuting(false)
    }
  }

  async function saveMemory() {
    const latest = conversation.at(-1)?.content
    if (!latest) return
    await fetch('/api/admin/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appSlug, scope: 'studio', memoryType: 'conversation', content: latest, key: `studio:${tab}`, importance: 0.7 }),
    })
    setStatus('Memory saved')
  }

  async function pollStudioJob(pollUrl: string) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const response = await fetch(pollUrl).catch(() => null)
      const data = await response?.json().catch(() => null)
      const statusText = String(data?.status ?? data?.job?.status ?? 'processing')
      setJobStatus(statusText)
      if (['completed', 'succeeded', 'failed'].includes(statusText)) return data as Record<string, unknown>
      await new Promise((resolve) => window.setTimeout(resolve, 2000))
    }
    setJobStatus('processing')
    return null
  }

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 shadow-[0_0_60px_rgba(34,211,238,0.04)] backdrop-blur-xl lg:p-7">
        <div className="pointer-events-none absolute right-0 top-0 h-60 w-80 rounded-bl-[8rem] bg-gradient-to-br from-cyan-500/10 via-indigo-500/8 to-transparent blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-400/80">Studio</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-100 lg:text-3xl">Operator studio.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Chat, code handoff, research, image, video, audio, voice, transcription, and artifacts are wired to protected backend routes.
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
            <DarkMetric label="Providers" value={String(APPROVED_AI_PROVIDERS.length)} />
            <DarkMetric label="Models" value={String(catalog?.models.length ?? '…')} />
            <DarkMetric label="GenX" value={catalog?.genx.live ? 'Live' : 'Fallback'} accent={catalog?.genx.live} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[240px_1fr]">
        {/* Tab rail */}
        <aside className="space-y-3 rounded-2xl border border-slate-700/50 bg-slate-900/60 p-3 backdrop-blur-xl">
          <div className="space-y-0.5">
            {studioTabs.map((item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={[
                  'w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-all',
                  tab === item
                    ? 'bg-cyan-500/10 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.06)]'
                    : 'text-slate-500 hover:bg-slate-800/60 hover:text-slate-300',
                ].join(' ')}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-slate-700/40 bg-slate-800/40 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Context</p>
            <div className="mt-2 space-y-1.5 text-xs text-slate-500">
              <p className="flex items-center gap-2"><Brain className="h-3.5 w-3.5 text-cyan-500" /> Dashboard-aware context loaded</p>
              <p className="flex items-center gap-2"><DatabaseZap className="h-3.5 w-3.5 text-cyan-500" /> Workspace memory available</p>
              <p className="flex items-center gap-2"><FolderInput className="h-3.5 w-3.5 text-cyan-500" /> Workbench handoff enabled</p>
            </div>
          </div>
        </aside>

        <div className="space-y-4">
          {/* Model controls */}
          <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4 backdrop-blur-xl">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <DarkField label="Provider">
                <select value={provider} onChange={(event) => setProvider(event.target.value)} className="dark-select">
                  <option value="auto">Auto routing</option>
                  {APPROVED_AI_PROVIDERS.map((item) => <option key={item.key} value={item.key}>{item.displayName}</option>)}
                </select>
              </DarkField>
              <DarkField label="Model / task">
                <select value={modelId} onChange={(event) => setModelId(event.target.value)} className="dark-select">
                  <option value="auto">Auto resolved</option>
                  {modelOptions.map((model) => <option key={`${model.provider}:${model.modelId}`} value={model.modelId}>{providerLabel(model.provider)} – {model.displayName}</option>)}
                </select>
              </DarkField>
              <DarkField label="Cost mode">
                <select value={costMode} onChange={(event) => setCostMode(event.target.value as CostMode)} className="dark-select">
                  <option value="cheap">cheap</option>
                  <option value="balanced">balanced</option>
                  <option value="premium">premium</option>
                </select>
              </DarkField>
              <DarkField label="Voice">
                <select value={voice} onChange={(event) => setVoice(event.target.value)} className="dark-select">
                  {(context?.voice ?? []).map((item) => <option key={item.provider} value={item.provider}>{item.label}</option>)}
                  {!context?.voice?.length && <option value="minimax">MiniMax/Mimo</option>}
                </select>
              </DarkField>
              <DarkField label="Adult policy">
                <select value={adultPolicy} onChange={(event) => setAdultPolicy(event.target.value)} className="dark-select">
                  {(catalog?.adultPolicies ?? ['off', 'suggestive', 'adult_text', 'adult_image', 'adult_video', 'adult_voice', 'full_adult_app_mode', 'specialist']).map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </DarkField>
            </div>
          </section>

          {/* Workspace panel */}
          <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-400/80">{tab}</p>
                <h3 className="mt-1 text-lg font-black text-slate-100">Ask, generate, research, or route work.</h3>
              </div>
              {(status || tabTruth.status) && (
                <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-bold text-slate-400">
                  {jobStatus ? `${status || tabTruth.status} / ${jobStatus}` : status || tabTruth.status}
                </span>
              )}
            </div>
            <p className="mt-3 rounded-xl border border-slate-700/40 bg-slate-800/40 px-3 py-2 text-xs font-semibold text-slate-500">
              {tabTruth.detail}
            </p>

            {/* Conversation / artifact area */}
            <div className="mt-4 h-[380px] overflow-auto rounded-xl border border-slate-700/40 bg-slate-950/60 p-4">
              {tab === 'Artifacts' ? (
                <div className="space-y-2">
                  {artifacts.map((artifact) => (
                    <div key={artifact.id} className="rounded-xl border border-slate-700/40 bg-slate-800/50 p-3">
                      <p className="text-sm font-black text-slate-200">{artifact.title || artifact.id}</p>
                      <ArtifactPreview artifact={artifact} />
                      <p className="mt-1 text-xs font-semibold text-slate-500">{artifact.type} / {artifact.subType || 'artifact'} — {artifact.provider || 'stored'}</p>
                      {artifact.storageUrl && <a href={artifact.storageUrl} className="mt-2 inline-block text-xs font-black text-cyan-400 hover:text-cyan-300">Open artifact ↗</a>}
                    </div>
                  ))}
                  {artifacts.length === 0 && <p className="text-sm font-semibold text-slate-500">No persisted artifacts returned yet.</p>}
                </div>
              ) : conversation.length === 0 ? (
                <div className="grid h-full place-items-center text-center">
                  <div>
                    <Sparkles className="mx-auto h-9 w-9 text-cyan-500/50" />
                    <p className="mt-3 text-sm font-bold text-slate-500">{tabTruth.status}</p>
                    <p className="mt-1 text-xs text-slate-600">{tabTruth.detail}</p>
                  </div>
                </div>
              ) : null}
              <div className="space-y-3">
                {conversation.map((entry, index) => (
                  <div
                    key={index}
                    className={entry.role === 'user'
                      ? 'ml-auto max-w-[78%] rounded-xl bg-cyan-500/10 border border-cyan-500/20 px-3 py-2.5 text-sm text-cyan-100'
                      : 'max-w-[82%] rounded-xl border border-slate-700/40 bg-slate-800/60 px-3 py-2.5 text-sm leading-6 text-slate-300'}
                  >
                    {entry.content || (streaming ? <Loader2 className="h-4 w-4 animate-spin text-cyan-400" /> : '')}
                  </div>
                ))}
              </div>
            </div>

            {audioPreview && <audio controls src={audioPreview} className="mt-3 w-full" />}

            {tab === 'STT / Transcription' && (
              <div className="mt-3 rounded-xl border border-slate-700/40 bg-slate-800/40 p-3">
                <input
                  type="file"
                  accept="audio/*,video/*"
                  onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                  className="text-sm font-semibold text-slate-400"
                />
              </div>
            )}

            {(tab === 'Image' || tab === 'Adult') && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <DarkField label="Output mode">
                  <select value={tab === 'Adult' ? adultMode : 'image'} onChange={(event) => setAdultMode(event.target.value as 'text' | 'image')} disabled={tab !== 'Adult'} className="dark-select">
                    {tab === 'Adult' && <option value="text">adult text</option>}
                    <option value="image">image</option>
                  </select>
                </DarkField>
                <DarkField label="Size">
                  <select value={mediaSize} onChange={(event) => setMediaSize(event.target.value)} className="dark-select">
                    <option value="1024x1024">1024×1024</option>
                    <option value="1024x1792">1024×1792</option>
                    <option value="1792x1024">1792×1024</option>
                    <option value="768x768">768×768 adult</option>
                  </select>
                </DarkField>
              </div>
            )}

            {/* Input + actions */}
            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={3}
                placeholder={placeholderForTab(tab)}
                className="min-h-24 resize-none rounded-xl border border-slate-700/50 bg-slate-800/60 px-4 py-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/10"
              />
              <div className="flex flex-col gap-2">
                <button
                  onClick={runStudioAction}
                  disabled={(tab !== 'Artifacts' && tab !== 'STT / Transcription' && !message.trim()) || streaming || executing || tab === 'Avatar / Talking Video'}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-black text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.25)] transition hover:bg-cyan-400 disabled:opacity-40 disabled:shadow-none"
                >
                  {streaming || executing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {actionLabelForTab(tab)}
                </button>
                <button onClick={() => abortRef.current?.abort()} disabled={!streaming} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/60 px-5 py-2.5 text-sm font-bold text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 disabled:opacity-40">
                  <Play className="h-4 w-4" />
                  Stop
                </button>
                <button onClick={saveMemory} disabled={!conversation.length} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/60 px-5 py-2.5 text-sm font-bold text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 disabled:opacity-40">
                  <Save className="h-4 w-4" />
                  Save
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/admin/dashboard/workbench?prompt=${encodeURIComponent(message)}`} className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/8 px-3 py-1.5 text-xs font-bold text-cyan-400 hover:bg-cyan-500/15">
                Send to Workbench <ArrowRight className="h-3 w-3" />
              </Link>
              <Link href="/admin/dashboard/apps-agents" className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/40 bg-slate-800/40 px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-800 hover:text-slate-300">
                Send to Apps & Agents <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}

function DarkMetric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={['rounded-xl border px-3 py-2.5', accent ? 'border-cyan-500/20 bg-cyan-500/8' : 'border-slate-700/40 bg-slate-800/40'].join(' ')}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={['mt-1 text-lg font-black', accent ? 'text-cyan-300' : 'text-slate-200'].join(' ')}>{value}</p>
    </div>
  )
}

function DarkField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <span className="mt-1.5 block [&_.dark-select]:w-full [&_.dark-select]:rounded-xl [&_.dark-select]:border [&_.dark-select]:border-slate-700/50 [&_.dark-select]:bg-slate-800/60 [&_.dark-select]:px-3 [&_.dark-select]:py-2 [&_.dark-select]:text-sm [&_.dark-select]:font-semibold [&_.dark-select]:text-slate-300 [&_.dark-select]:outline-none [&_.dark-select]:focus:border-cyan-500/50">{children}</span>
    </label>
  )
}

function capabilityForTab(tab: StudioTab) {
  if (tab === 'Coding') return 'code'
  if (tab === 'Research') return 'scrape_website'
  if (tab === 'Image') return 'image_generation'
  if (tab === 'Video' || tab === 'Avatar / Talking Video') return 'video_generation'
  if (tab === 'Voice / TTS') return 'tts'
  if (tab === 'STT / Transcription') return 'stt'
  if (tab === 'Adult') return 'adult_text'
  return 'chat'
}

function capabilityGroupForTab(tab: StudioTab): keyof UniversalModelCatalog['grouped'] {
  if (tab === 'Coding') return 'coding'
  if (tab === 'Research') return 'chat'
  if (tab === 'Image') return 'image'
  if (tab === 'Video' || tab === 'Avatar / Talking Video') return 'video'
  if (tab === 'Music / Audio') return 'music/audio'
  if (tab === 'Voice / TTS') return 'voice/TTS'
  if (tab === 'STT / Transcription') return 'STT'
  if (tab === 'Adult') return 'adult'
  if (tab === 'Artifacts') return 'embeddings/moderation'
  return 'chat'
}

function placeholderForTab(tab: StudioTab) {
  if (tab === 'Research') return 'Research Candy AI, compare the product, propose our own architecture, and create Workbench tasks.'
  if (tab === 'Coding') return 'Describe the repo change to plan and send to Workbench.'
  if (tab === 'Adult') return 'Adult-capable requests are routed only when the app policy allows the requested content type.'
  if (tab === 'Artifacts') return 'Ask to summarize, link, or retrieve generated artifacts and job outputs.'
  return 'Ask the operator studio to help with this app, another connected app, or an operational task.'
}

function actionLabelForTab(tab: StudioTab) {
  if (tab === 'Coding') return 'Send to Workbench'
  if (tab === 'Artifacts') return 'Refresh'
  if (tab === 'STT / Transcription') return 'Transcribe'
  if (tab === 'Chat') return 'Send'
  return 'Run'
}

function summarizeStudioResult(data: Record<string, unknown>) {
  if (typeof data.workbenchUrl === 'string') return `Workbench task saved.\n${data.workbenchUrl}`
  const result = data.result as Record<string, unknown> | undefined
  if (typeof result?.transcript === 'string') return result.transcript
  if (typeof result?.output === 'string') return result.output
  if (typeof result?.script === 'string') return result.script
  if (typeof result?.imageUrl === 'string') return `Image generated: ${result.imageUrl}`
  if (typeof result?.jobId === 'string') return `Job created: ${result.jobId}`
  if (data.artifact && typeof data.artifact === 'object' && 'id' in data.artifact) {
    return `Artifact saved: ${String((data.artifact as { id?: unknown }).id)}`
  }
  return JSON.stringify(data, null, 2)
}

function ArtifactPreview({ artifact }: { artifact: ArtifactSummary }) {
  const url = getArtifactUrl(artifact)
  const kind = `${artifact.type ?? ''} ${artifact.subType ?? ''}`.toLowerCase()
  if (!url) return <p className="mt-2 text-xs font-semibold text-amber-300/80">Job created, output pending.</p>
  if (kind.includes('image')) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={artifact.title ?? artifact.id} className="mt-3 max-h-64 w-full rounded-lg object-contain" />
  }
  if (kind.includes('video')) return <video controls src={url} className="mt-3 max-h-64 w-full rounded-lg" />
  if (kind.includes('audio') || kind.includes('voice')) return <audio controls src={url} className="mt-3 w-full" />
  return <a href={url} className="mt-2 inline-block text-xs font-black text-cyan-400 hover:text-cyan-300">Open artifact</a>
}

function getArtifactUrl(artifact: ArtifactSummary) {
  return artifact.storageUrl
    ?? artifact.contentUrl
    ?? artifact.url
    ?? stringMeta(artifact.metadata, 'storageUrl')
    ?? stringMeta(artifact.metadata, 'resultUrl')
    ?? stringMeta(artifact.metadata, 'imageUrl')
    ?? ''
}

function extractResultUrl(job: Record<string, unknown>) {
  return stringMeta(job, 'resultUrl') ?? stringMeta(job, 'storageUrl') ?? stringMeta(job, 'artifactUrl') ?? ''
}

function stringMeta(source: Record<string, unknown> | undefined, key: string) {
  const value = source?.[key]
  return typeof value === 'string' ? value : undefined
}
