'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
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
type ArtifactSummary = { id: string; title?: string; type?: string; subType?: string; provider?: string; model?: string; storageUrl?: string; createdAt?: string }

export default function StudioPage() {
  const [tab, setTab] = useState<StudioTab>('Chat')
  const [catalog, setCatalog] = useState<UniversalModelCatalog | null>(null)
  const [context, setContext] = useState<AssistantContext | null>(null)
  const [modelId, setModelId] = useState('auto')
  const [provider, setProvider] = useState('auto')
  const [costMode, setCostMode] = useState<CostMode>('balanced')
  const [voice, setVoice] = useState('minimax')
  const [appSlug] = useState('superbrain')
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

  useEffect(() => {
    if (tab === 'Artifacts') loadArtifacts().catch(() => null)
  }, [tab])

  const tabCapability = useMemo(() => capabilityForTab(tab), [tab])
  const tabTruth = STUDIO_TAB_TRUTH[tab]
  const modelOptions = useMemo(() => {
    if (!catalog) return []
    if (tab === 'Adult') return catalog.grouped.adult?.length ? catalog.grouped.adult : catalog.models.filter((model) => model.supportsAdult)
    return catalog.grouped[capabilityGroupForTab(tab)] ?? catalog.models
  }, [catalog, tab])

  const selectedModel = modelOptions.find((model) => model.modelId === modelId)

  async function loadArtifacts() {
    const response = await fetch('/api/admin/artifacts?appSlug=superbrain&limit=30')
    const data = await response.json().catch(() => ({}))
    setArtifacts(Array.isArray(data.artifacts) ? data.artifacts as ArtifactSummary[] : [])
  }

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
      setConversation((current) => [
        ...current,
        { role: 'user', content: message },
        { role: 'assistant', content: summarizeStudioResult(data) },
      ])
      setStatus(data.workbenchUrl ? 'Workbench handoff saved' : data.artifact?.id ? `Artifact saved: ${data.artifact.id}` : 'Backend executed')
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

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-white/70 bg-white/70 shadow-[0_24px_100px_rgba(15,23,42,0.12)] backdrop-blur-2xl">
        <div className="relative p-6 lg:p-8">
          <div className="absolute right-0 top-0 h-44 w-80 rounded-bl-[8rem] bg-gradient-to-br from-cyan-300/55 via-indigo-300/35 to-transparent blur-2xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-700">Studio</p>
              <h2 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-slate-950 lg:text-5xl">The Superbrain workspace.</h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
                Chat, code, research, generate media, manage voice, use app-aware memory, and hand work to the autonomous Workbench from one console.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <StudioMetric label="Providers" value={String(APPROVED_AI_PROVIDERS.length)} />
              <StudioMetric label="Models/tasks" value={String(catalog?.models.length ?? 0)} />
              <StudioMetric label="GenX catalog" value={catalog?.genx.live ? 'Live' : 'Fallback'} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4 rounded-3xl border border-white/70 bg-white/60 p-4 shadow-[0_18px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl">
          <div className="grid gap-2">
            {studioTabs.map((item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={[
                  'rounded-2xl px-3 py-2.5 text-left text-sm font-bold transition',
                  tab === item ? 'bg-slate-950 text-white shadow-lg' : 'text-slate-500 hover:bg-white/70 hover:text-slate-950',
                ].join(' ')}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Context</p>
            <div className="mt-3 space-y-2 text-xs text-slate-600">
              <p className="flex items-center gap-2"><Brain className="h-4 w-4 text-cyan-700" /> Dashboard-aware context loaded</p>
              <p className="flex items-center gap-2"><DatabaseZap className="h-4 w-4 text-cyan-700" /> Memory and emotion state available</p>
              <p className="flex items-center gap-2"><FolderInput className="h-4 w-4 text-cyan-700" /> Workbench handoff enabled</p>
            </div>
          </div>
        </aside>

        <div className="space-y-5">
          <section className="rounded-3xl border border-white/70 bg-white/65 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl">
            <div className="grid gap-3 lg:grid-cols-5">
              <Field label="Provider">
                <select value={provider} onChange={(event) => setProvider(event.target.value)} className="input">
                  <option value="auto">Auto routing</option>
                  {APPROVED_AI_PROVIDERS.map((item) => <option key={item.key} value={item.key}>{item.displayName}</option>)}
                </select>
              </Field>
              <Field label="Model / task">
                <select value={modelId} onChange={(event) => setModelId(event.target.value)} className="input">
                  <option value="auto">Auto resolved model</option>
                  {modelOptions.map((model) => <option key={`${model.provider}:${model.modelId}`} value={model.modelId}>{providerLabel(model.provider)} - {model.displayName}</option>)}
                </select>
              </Field>
              <Field label="Cost mode">
                <select value={costMode} onChange={(event) => setCostMode(event.target.value as CostMode)} className="input">
                  <option value="cheap">cheap</option>
                  <option value="balanced">balanced</option>
                  <option value="premium">premium</option>
                </select>
              </Field>
              <Field label="Voice">
                <select value={voice} onChange={(event) => setVoice(event.target.value)} className="input">
                  {(context?.voice ?? []).map((item) => <option key={item.provider} value={item.provider}>{item.label} - {item.status}</option>)}
                  {!context?.voice?.length && <option value="minimax">MiniMax/Mimo - Needs key/test</option>}
                </select>
              </Field>
              <Field label="Adult policy">
                <select value={adultPolicy} onChange={(event) => setAdultPolicy(event.target.value)} className="input">
                  {(catalog?.adultPolicies ?? ['off', 'suggestive', 'adult_text', 'adult_image', 'adult_video', 'adult_voice', 'full_adult_app_mode', 'specialist']).map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </Field>
            </div>
          </section>

          <section className="rounded-3xl border border-white/70 bg-white/70 p-5 shadow-[0_24px_100px_rgba(15,23,42,0.12)] backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">{tab}</p>
                <h3 className="mt-1 text-2xl font-black text-slate-950">Ask, generate, research, or route work.</h3>
              </div>
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white">{status || tabTruth.status}</span>
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-sm font-semibold text-slate-600">
              {tabTruth.detail}
            </div>

            <div className="mt-5 h-[420px] overflow-auto rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              {tab === 'Artifacts' ? (
                <div className="space-y-3">
                  {artifacts.map((artifact) => (
                    <div key={artifact.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                      <p className="text-sm font-black text-slate-900">{artifact.title || artifact.id}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{artifact.type} / {artifact.subType || 'artifact'} - {artifact.provider || 'stored'}</p>
                      {artifact.storageUrl && <a href={artifact.storageUrl} className="mt-2 inline-block text-xs font-black text-cyan-700">Open artifact</a>}
                    </div>
                  ))}
                  {artifacts.length === 0 && <p className="text-sm font-semibold text-slate-500">No persisted artifacts returned yet.</p>}
                </div>
              ) : conversation.length === 0 && (
                <div className="grid h-full place-items-center text-center">
                  <div>
                    <Sparkles className="mx-auto h-10 w-10 text-cyan-700" />
                    <p className="mt-3 text-sm font-bold text-slate-700">{tabTruth.status}</p>
                    <p className="mt-1 text-xs text-slate-500">{tabTruth.detail}</p>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {conversation.map((entry, index) => (
                  <div key={index} className={entry.role === 'user' ? 'ml-auto max-w-[78%] rounded-2xl bg-slate-950 p-3 text-sm text-white' : 'max-w-[82%] rounded-2xl border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700'}>
                    {entry.content || (streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : '')}
                  </div>
                ))}
              </div>
            </div>
            {audioPreview && <audio controls src={audioPreview} className="mt-3 w-full" />}

            {tab === 'STT / Transcription' && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white/75 p-3">
                <input
                  type="file"
                  accept="audio/*,video/*"
                  onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                  className="text-sm font-semibold text-slate-700"
                />
              </div>
            )}

            {(tab === 'Image' || tab === 'Adult') && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Output mode">
                  <select value={tab === 'Adult' ? adultMode : 'image'} onChange={(event) => setAdultMode(event.target.value as 'text' | 'image')} disabled={tab !== 'Adult'} className="input">
                    {tab === 'Adult' && <option value="text">adult text</option>}
                    <option value="image">image</option>
                  </select>
                </Field>
                <Field label="Size">
                  <select value={mediaSize} onChange={(event) => setMediaSize(event.target.value)} className="input">
                    <option value="1024x1024">1024x1024</option>
                    <option value="1024x1792">1024x1792</option>
                    <option value="1792x1024">1792x1024</option>
                    <option value="768x768">768x768 adult image</option>
                  </select>
                </Field>
              </div>
            )}

            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={4}
                placeholder={placeholderForTab(tab)}
                className="min-h-28 resize-none rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
              />
              <div className="flex flex-col gap-2">
                <button onClick={runStudioAction} disabled={(tab !== 'Artifacts' && tab !== 'STT / Transcription' && !message.trim()) || streaming || executing || tab === 'Avatar / Talking Video'} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg hover:bg-slate-800 disabled:opacity-45">
                  {streaming || executing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {actionLabelForTab(tab)}
                </button>
                <button onClick={() => abortRef.current?.abort()} disabled={!streaming} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 disabled:opacity-45">
                  <Play className="h-4 w-4" />
                  Stop
                </button>
                <button onClick={saveMemory} disabled={!conversation.length} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 disabled:opacity-45">
                  <Save className="h-4 w-4" />
                  Save
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/admin/dashboard/workbench?prompt=${encodeURIComponent(message)}`} className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-xs font-black text-cyan-800 hover:bg-cyan-100">
                Send coding task to Workbench <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link href="/admin/dashboard/apps-agents" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">
                Send app idea to Apps & Agents <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}

function StudioMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/65 px-4 py-3 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</span>
      <span className="mt-2 block [&_.input]:w-full [&_.input]:rounded-2xl [&_.input]:border [&_.input]:border-slate-200 [&_.input]:bg-white/85 [&_.input]:px-3 [&_.input]:py-2.5 [&_.input]:text-sm [&_.input]:font-semibold [&_.input]:text-slate-800 [&_.input]:outline-none [&_.input]:focus:border-cyan-300 [&_.input]:focus:ring-4 [&_.input]:focus:ring-cyan-100">{children}</span>
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
  return 'Ask the Superbrain to help with this app, another connected app, or an operator task.'
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
