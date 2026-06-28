'use client'

import type React from 'react'
import { useMemo, useState } from 'react'
import { ArrowRight, ImageIcon, Loader2, Mic, Music, Paperclip, Send, Sparkles, Upload, Video } from 'lucide-react'
import { STUDIO_ROUTE_MAP, type StudioTab } from '@/lib/studio-route-map'
import type { CostMode } from '@/lib/approved-ai-catalog'

type TaskId = 'chat' | 'image' | 'video' | 'long-video' | 'music' | 'tts' | 'stt' | 'avatar' | 'research' | 'campaign'

type StudioTask = {
  id: TaskId
  label: string
  tab: StudioTab
  capability: string
  icon: React.ReactNode
  placeholder: string
}

const TASKS: StudioTask[] = [
  { id: 'chat', label: 'Chat', tab: 'Chat', capability: 'chat', icon: <Sparkles />, placeholder: 'Ask the platform to reason, draft, plan, or explain.' },
  { id: 'image', label: 'Image', tab: 'Image', capability: 'image_generation', icon: <ImageIcon />, placeholder: 'Describe the image, style, references, and intended use.' },
  { id: 'video', label: 'Video', tab: 'Video', capability: 'video_generation', icon: <Video />, placeholder: 'Describe a short video, reference image, camera motion, and format.' },
  { id: 'long-video', label: 'Long-form Video', tab: 'Video', capability: 'long_form_video', icon: <Video />, placeholder: 'Describe script, scenes, music, voice, stitching, and final format.' },
  { id: 'music', label: 'Music', tab: 'Music / Audio', capability: 'music_generation', icon: <Music />, placeholder: 'Describe genre, lyrics, vocals, mood, and duration over two minutes.' },
  { id: 'tts', label: 'Voice/TTS', tab: 'Voice / TTS', capability: 'tts', icon: <Mic />, placeholder: 'Paste the voice script and choose delivery style.' },
  { id: 'stt', label: 'STT', tab: 'STT / Transcription', capability: 'stt', icon: <Upload />, placeholder: 'Upload or record audio, then request a transcript.' },
  { id: 'avatar', label: 'Avatar', tab: 'Avatar / Talking Video', capability: 'avatar_video', icon: <Sparkles />, placeholder: 'Describe persona, consistency reference, voice, and animation.' },
  { id: 'research', label: 'RAG/Research', tab: 'Research', capability: 'research', icon: <Paperclip />, placeholder: 'Add a source URL, document note, or research query.' },
  { id: 'campaign', label: 'Campaign', tab: 'Research', capability: 'campaign_workflow', icon: <ArrowRight />, placeholder: 'Describe brand/app context, channels, days, and asset types.' },
]

type StudioMessage = { role: 'user' | 'assistant'; content: string }
type StudioExecutionState = 'idle' | 'validating' | 'submitted' | 'processing' | 'completed' | 'failed'
type StudioResult = {
  text: string
  status: StudioExecutionState
  mediaType?: 'image' | 'audio' | 'music' | 'video'
  provider?: string
  model?: string
  artifactId?: string
  artifactUrl?: string
  jobUrl?: string
  outputUrl?: string
  blocker?: string
}
type ActiveStudioJob = {
  id: string
  pollUrl: string
  taskId: TaskId
  status: StudioExecutionState
  provider?: string
  model?: string
  blocker?: string
}

export default function StudioPage() {
  const [taskId, setTaskId] = useState<TaskId>('chat')
  const [prompt, setPrompt] = useState('')
  const [costMode, setCostMode] = useState<CostMode>('balanced')
  const [qualityTier, setQualityTier] = useState('standard')
  const [appSlug, setAppSlug] = useState('amarktai-network')
  const [messages, setMessages] = useState<StudioMessage[]>([])
  const [result, setResult] = useState<StudioResult | null>(null)
  const [activeJobs, setActiveJobs] = useState<ActiveStudioJob[]>([])
  const [recentArtifacts, setRecentArtifacts] = useState<StudioResult[]>([])
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState<StudioExecutionState>('idle')

  const [imageSize, setImageSize] = useState('1024x1024')
  const [imageStyle, setImageStyle] = useState('premium realistic')
  const [imageCount, setImageCount] = useState('1')
  const [videoDuration, setVideoDuration] = useState('1m30s')
  const [videoFormat, setVideoFormat] = useState('16:9')
  const [videoStyle, setVideoStyle] = useState('cinematic')
  const [videoCount, setVideoCount] = useState('1')
  const [sceneCount, setSceneCount] = useState('6')
  const [longVideoVoice, setLongVideoVoice] = useState('on')
  const [longVideoMusic, setLongVideoMusic] = useState('on')
  const [longVideoStitching, setLongVideoStitching] = useState('on')
  const [musicGenre, setMusicGenre] = useState('cinematic pop')
  const [musicGenre2, setMusicGenre2] = useState('')
  const [musicGenre3, setMusicGenre3] = useState('')
  const [musicGenre4, setMusicGenre4] = useState('')
  const [musicGenre5, setMusicGenre5] = useState('')
  const [musicMood, setMusicMood] = useState('uplifting')
  const [musicVocals, setMusicVocals] = useState('female vocal')
  const [musicBpm, setMusicBpm] = useState('0')
  const [musicLanguage, setMusicLanguage] = useState('English')
  const [musicDuration, setMusicDuration] = useState('180s')
  const [musicCount, setMusicCount] = useState('1')
  const [lyrics, setLyrics] = useState('')
  const [musicIntro, setMusicIntro] = useState('')
  const [musicVerse, setMusicVerse] = useState('')
  const [musicChorus, setMusicChorus] = useState('')
  const [musicBridge, setMusicBridge] = useState('')
  const [musicOutro, setMusicOutro] = useState('')
  const [musicVideoEnabled, setMusicVideoEnabled] = useState('off')
  const [musicVideoVisualStyle, setMusicVideoVisualStyle] = useState('')
  const [musicVideoStoryConcept, setMusicVideoStoryConcept] = useState('')
  const [musicVideoAspectRatio, setMusicVideoAspectRatio] = useState('16:9')
  const [musicVideoDuration, setMusicVideoDuration] = useState('180s')
  const [musicVideoSceneCount, setMusicVideoSceneCount] = useState('6')
  const [voiceStyle, setVoiceStyle] = useState('calm assistant')
  const [voiceSpeed, setVoiceSpeed] = useState('normal')
  const [voiceCloneName, setVoiceCloneName] = useState('')
  const [voiceCloneConsent, setVoiceCloneConsent] = useState('no')
  const [voiceClonePhrase, setVoiceClonePhrase] = useState('Welcome to AmarktAI Network.')
  const [sourceUrl, setSourceUrl] = useState('')
  const [campaignChannels, setCampaignChannels] = useState('web, social, email')
  const [campaignDays, setCampaignDays] = useState('14')
  const [campaignAssetTypes, setCampaignAssetTypes] = useState('copy, image, document')
  const [avatarLibrary, setAvatarLibrary] = useState('default')
  const [avatarMode, setAvatarMode] = useState('video')
  const [avatarConsistency, setAvatarConsistency] = useState('on')
  const [sttFile, setSttFile] = useState<File | null>(null)

  const task = useMemo(() => TASKS.find((item) => item.id === taskId) ?? TASKS[0], [taskId])
  const routeInfo = STUDIO_ROUTE_MAP[task.tab]
  const canSubmit = task.id === 'stt' || prompt.trim().length > 0

  async function submit() {
    if (!canSubmit || running) return
    setRunning(true)
    setStatus('validating')
    setResult(null)

    try {
      if (task.id === 'chat') {
        await runChat()
      } else if (task.id === 'stt') {
        await runTranscription()
      } else {
        await runCapability()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Studio execution failed'
      setStatus('failed')
      setResult({ text: message, status: 'failed', blocker: message })
    } finally {
      setRunning(false)
    }
  }

  async function runChat() {
    const userMessage = prompt.trim()
    setMessages((current) => [...current, { role: 'user', content: userMessage }])
    setPrompt('')
    const response = await fetch('/api/admin/studio/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tab: task.tab,
        mode: 'chat',
        prompt: userMessage,
        appSlug,
        costMode,
        qualityTier,
        controls: buildControls(task.id),
      }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || data.success === false || data.ok === false) throw new Error(data.blocker ?? data.error ?? 'Chat route is not available')
    const answer = String(data.output ?? data.result?.output ?? 'No response returned.')
    setMessages((current) => [...current, { role: 'assistant', content: answer || 'No response returned.' }])
    setResult({
      text: answer || 'No response returned.',
      status: normalizeExecutionState(data.status ?? 'completed'),
      provider: data.selectedProvider ?? data.provider,
      model: data.selectedModel ?? data.model,
    })
    setStatus('completed')
  }

  async function runCapability() {
    const payload = {
      tab: task.tab,
      mode: task.id,
      capability: task.capability,
      prompt,
      appSlug,
      costMode,
      qualityTier,
      controls: buildControls(task.id),
    }
    const response = await fetch('/api/admin/studio/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || data.success === false) throw new Error(data.error ?? data.result?.error ?? 'Execution is not wired for this task')
    const initial = normalizeStudioResult(data, task.id)
    const text = initial.text
    setMessages((current) => [...current, { role: 'user', content: prompt }, { role: 'assistant', content: text }])
    setResult(initial)
    setStatus(initial.status)
    if (initial.artifactId) rememberArtifact(initial)
    if (initial.status === 'processing' && initial.jobUrl) {
      const jobId = initial.jobUrl.split('/').filter(Boolean).pop() ?? initial.jobUrl
      const activeJob = {
        id: jobId,
        pollUrl: initial.jobUrl,
        taskId: task.id,
        status: 'processing' as const,
        provider: initial.provider,
        model: initial.model,
      }
      setActiveJobs((current) => upsertActiveJob(current, activeJob))
      void pollStudioJob(activeJob)
    }
    setPrompt('')
  }

  async function pollStudioJob(job: ActiveStudioJob) {
    const maxPolls = 120
    for (let attempt = 0; attempt < maxPolls; attempt += 1) {
      await sleep(attempt === 0 ? 1000 : 3000)
      const response = await fetch(job.pollUrl, { cache: 'no-store' })
      const data = await response.json().catch(() => ({}))
      const hydrated = normalizeStudioResult(data, job.taskId)
      const nextStatus = hydrated.status === 'submitted' ? 'processing' : hydrated.status
      setActiveJobs((current) => upsertActiveJob(current, {
        ...job,
        status: nextStatus,
        provider: hydrated.provider ?? job.provider,
        model: hydrated.model ?? job.model,
        blocker: hydrated.blocker,
      }))
      setResult(hydrated)
      setStatus(nextStatus)
      if (nextStatus === 'completed') {
        if (!hydrated.artifactId && !hydrated.outputUrl) {
          const blocker = 'Job completed but no artifact was returned/saved.'
          const failed = { ...hydrated, status: 'failed' as const, blocker, text: blocker }
          setResult(failed)
          setStatus('failed')
          setMessages((current) => [...current, { role: 'assistant', content: blocker }])
          return
        }
        rememberArtifact(hydrated)
        setMessages((current) => [...current, { role: 'assistant', content: hydrated.text }])
        return
      }
      if (nextStatus === 'failed') {
        const blocker = hydrated.blocker ?? 'Media job failed.'
        setMessages((current) => [...current, { role: 'assistant', content: blocker }])
        return
      }
    }
    const blocker = 'Media job timed out before completion.'
    setActiveJobs((current) => upsertActiveJob(current, { ...job, status: 'failed', blocker }))
    setResult({ text: blocker, status: 'failed', blocker, provider: job.provider, model: job.model, jobUrl: job.pollUrl })
    setStatus('failed')
  }

  function rememberArtifact(item: StudioResult) {
    if (!item.artifactId) return
    setRecentArtifacts((current) => [item, ...current.filter((entry) => entry.artifactId !== item.artifactId)].slice(0, 5))
  }

  async function runTranscription() {
    if (!sttFile) {
      const message = 'Audio file is required for /api/admin/studio/stt'
      setResult({ text: message, status: 'failed', blocker: message })
      setStatus('failed')
      return
    }
    const form = new FormData()
    form.append('file', sttFile)
    form.append('appSlug', appSlug)
    const response = await fetch('/api/admin/studio/stt', { method: 'POST', body: form })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || data.success === false) throw new Error(data.error ?? data.result?.error ?? 'STT execution failed')
    const transcript = typeof data.result?.transcript === 'string' ? data.result.transcript : summarizeResult(data)
    setMessages((current) => [...current, { role: 'user', content: `Transcribe ${sttFile.name}` }, { role: 'assistant', content: transcript }])
    setResult({
      text: transcript,
      status: normalizeExecutionState(data.result?.status ?? 'completed'),
      provider: data.result?.provider,
      model: data.result?.model,
      artifactId: data.artifact?.id,
    })
    setStatus('completed')
  }

  function buildControls(id: TaskId) {
    if (id === 'image') return { size: imageSize, style: imageStyle, count: imageCount, references: 'reference image upload' }
    if (id === 'video') return { duration: videoDuration, format: videoFormat, style: videoStyle, count: videoCount, referenceImage: 'reference image upload' }
    if (id === 'long-video') return { duration: videoDuration, format: videoFormat, style: videoStyle, sceneCount, music: longVideoMusic, voice: longVideoVoice, stitching: longVideoStitching }
    if (id === 'music') return {
      genre: musicGenre,
      genres: [musicGenre, musicGenre2, musicGenre3, musicGenre4, musicGenre5].filter(Boolean).slice(0, 5),
      mood: musicMood,
      vocals: musicVocals,
      vocalStyle: musicVocals,
      instrumental: musicVocals === 'instrumental_only' ? 'on' : 'off',
      bpm: musicBpm,
      language: musicLanguage,
      duration: musicDuration,
      count: musicCount,
      lyrics,
      intro: musicIntro,
      verse: musicVerse,
      chorus: musicChorus,
      bridge: musicBridge,
      outro: musicOutro,
      musicVideoEnabled,
      musicVideoVisualStyle,
      musicVideoStoryConcept,
      musicVideoAspectRatio,
      musicVideoDuration,
      musicVideoSceneCount,
    }
    if (id === 'tts') return { voice: voiceStyle, speed: voiceSpeed, style: voiceStyle, voiceCloneName, voiceCloneConsent, voiceClonePhrase }
    if (id === 'avatar') return { library: avatarLibrary, persona: true, consistencyReference: avatarConsistency, voice: voiceStyle, mode: avatarMode }
    if (id === 'research') return { sourceUrl, query: prompt }
    if (id === 'campaign') return { appSlug, channels: campaignChannels, days: campaignDays, assetTypes: campaignAssetTypes }
    return {}
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <section className="rounded-2xl border border-slate-800 bg-[#071019] p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Studio</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white lg:text-5xl">Chat-first capability workspace</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
              Choose the task, describe the outcome, and let runtime select execution after policy, context, budget, and quality checks.
            </p>
          </div>
          <div className="flex gap-2">
            <select value={costMode} onChange={(event) => setCostMode(event.target.value as CostMode)} className="studio-select">
              <option value="cheap">Economy</option>
              <option value="balanced">Balanced</option>
              <option value="premium">Premium</option>
            </select>
            <select value={qualityTier} onChange={(event) => setQualityTier(event.target.value)} className="studio-select">
              <option value="standard">Standard</option>
              <option value="preview">Preview</option>
              <option value="high">High quality</option>
            </select>
          </div>
        </div>
      </section>

      <section data-studio-task-selector="true" className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/55 p-2">
        {TASKS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTaskId(item.id)}
            className={[
              'inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition',
              item.id === task.id ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200' : 'border-transparent text-slate-500 hover:bg-slate-800 hover:text-slate-300',
            ].join(' ')}
          >
            <span className="[&_svg]:h-4 [&_svg]:w-4">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </section>

      <section className="grid min-h-[640px] gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-h-[640px] flex-col rounded-2xl border border-slate-800 bg-slate-950/60">
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.length === 0 ? (
              <div className="grid min-h-[360px] place-items-center text-center">
                <div>
                  <Sparkles className="mx-auto h-10 w-10 text-cyan-300/60" />
                  <p className="mt-4 text-lg font-black text-white">Start with a request.</p>
                  <p className="mt-2 max-w-md text-sm leading-7 text-slate-500">{task.placeholder}</p>
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={message.role === 'user' ? 'ml-auto max-w-[82%]' : 'mr-auto max-w-[82%]'}>
                  <div className={[
                    'rounded-2xl px-4 py-3 text-sm leading-7',
                    message.role === 'user' ? 'bg-cyan-300 text-slate-950' : 'border border-slate-800 bg-slate-900 text-slate-200',
                  ].join(' ')}>
                    {message.content}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-slate-800 p-4">
            <TaskControls
              task={task.id}
              values={{
                imageSize, imageStyle, imageCount, videoDuration, videoFormat, videoStyle, videoCount, sceneCount,
                longVideoVoice, longVideoMusic, longVideoStitching, musicGenre, musicGenre2, musicGenre3, musicGenre4,
                musicGenre5, musicMood, musicVocals, musicBpm, musicLanguage, musicDuration, musicCount, lyrics,
                musicIntro, musicVerse, musicChorus, musicBridge, musicOutro, musicVideoEnabled, musicVideoVisualStyle,
                musicVideoStoryConcept, musicVideoAspectRatio, musicVideoDuration, musicVideoSceneCount,
                voiceStyle, voiceSpeed, voiceCloneName, voiceCloneConsent, voiceClonePhrase,
                sourceUrl, campaignChannels, campaignDays, campaignAssetTypes, appSlug, avatarLibrary, avatarMode, avatarConsistency,
              }}
              setters={{
                setImageSize, setImageStyle, setImageCount, setVideoDuration, setVideoFormat, setVideoStyle, setVideoCount,
                setSceneCount, setLongVideoVoice, setLongVideoMusic, setLongVideoStitching, setMusicGenre, setMusicGenre2,
                setMusicGenre3, setMusicGenre4, setMusicGenre5, setMusicMood, setMusicVocals, setMusicBpm, setMusicLanguage,
                setMusicDuration, setMusicCount, setLyrics, setMusicIntro, setMusicVerse, setMusicChorus, setMusicBridge,
                setMusicOutro, setMusicVideoEnabled, setMusicVideoVisualStyle, setMusicVideoStoryConcept, setMusicVideoAspectRatio,
                setMusicVideoDuration, setMusicVideoSceneCount, setVoiceStyle, setVoiceSpeed, setVoiceCloneName,
                setVoiceCloneConsent, setVoiceClonePhrase, setSourceUrl, setCampaignChannels, setCampaignDays, setCampaignAssetTypes,
                setAppSlug, setAvatarLibrary, setAvatarMode, setAvatarConsistency,
              }}
              setSttFile={setSttFile}
            />
            <div className="mt-3 flex gap-2">
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={task.placeholder}
                rows={4}
                className="min-h-28 flex-1 resize-y rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/50"
              />
              <button
                type="button"
                onClick={() => void submit()}
                disabled={!canSubmit || running}
                className="grid w-14 shrink-0 place-items-center rounded-2xl bg-cyan-300 text-slate-950 transition hover:bg-cyan-200 disabled:opacity-40"
                aria-label="Run Studio task"
              >
                {running ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </div>
            {status !== 'idle' && <p className="mt-3 text-xs font-bold text-slate-500">{labelState(status)}</p>}
          </div>
        </div>

        <aside className="space-y-4">
          {result?.outputUrl && result.status === 'completed' && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Preview</p>
              {result.mediaType === 'image' ? (
                <img src={result.outputUrl} alt="Generated Studio output" className="mt-4 aspect-square w-full rounded-xl border border-slate-800 object-cover" />
              ) : result.mediaType === 'audio' || result.mediaType === 'music' ? (
                <audio src={result.outputUrl} controls className="mt-4 w-full" />
              ) : (
                <a href={result.outputUrl} target="_blank" rel="noreferrer" className="mt-4 block break-words text-sm font-bold text-cyan-200 hover:text-cyan-100">{result.outputUrl}</a>
              )}
            </section>
          )}

          <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Execution proof</p>
            {result ? (
              <div className="mt-4 space-y-2">
                <Proof label="Status" value={result.status} />
                {result.provider && <Proof label="Resolved provider" value={result.provider} />}
                {result.model && <Proof label="Resolved model" value={result.model} />}
                {result.artifactId && <Proof label="Artifact" value={result.artifactId} />}
                {result.artifactUrl && <ProofLink label="Artifact link" value={result.artifactUrl} />}
                {result.jobUrl && <ProofLink label="Job link" value={result.jobUrl} />}
                {result.outputUrl && <ProofLink label="Output link" value={result.outputUrl} />}
                {result.blocker && <Proof label="Blocker" value={result.blocker} />}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-7 text-slate-500">Proof appears after a real execution result. No infrastructure selector is exposed.</p>
            )}
          </section>

          {activeJobs.length > 0 && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Active jobs</p>
              <div className="mt-4 space-y-2">
                {activeJobs.map((job) => (
                  <div key={job.id} className="rounded-xl border border-slate-800 bg-slate-950/55 px-3 py-2">
                    <p className="text-xs font-black text-slate-300">{job.taskId}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">{labelState(job.status)}</p>
                    {job.blocker && <p className="mt-1 text-xs font-bold text-rose-200">{job.blocker}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {recentArtifacts.length > 0 && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Recent artifacts</p>
              <div className="mt-4 space-y-2">
                {recentArtifacts.map((artifact) => (
                  <div key={artifact.artifactId} className="rounded-xl border border-slate-800 bg-slate-950/55 px-3 py-2">
                    <p className="text-xs font-black text-slate-300">{artifact.artifactId}</p>
                    {artifact.artifactUrl && <a href={artifact.artifactUrl} target="_blank" rel="noreferrer" className="mt-1 block break-words text-xs font-bold text-cyan-200 hover:text-cyan-100">Open artifact</a>}
                  </div>
                ))}
              </div>
            </section>
          )}

          <details className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
            <summary className="cursor-pointer text-sm font-black text-slate-300">Advanced route details</summary>
            <div className="mt-4 space-y-2">
              <Proof label="Task route" value={routeInfo.route ?? 'backend route not implemented'} />
              <Proof label="Readiness" value={routeInfo.detail} />
              <Proof label="Capability" value={task.capability} />
            </div>
          </details>
        </aside>
      </section>
    </div>
  )
}

function TaskControls({
  task,
  values,
  setters,
  setSttFile,
}: {
  task: TaskId
  values: Record<string, string>
  setters: Record<string, (value: string) => void>
  setSttFile: (file: File | null) => void
}) {
  if (task === 'image') {
    return <ControlGrid><Field label="Reference image upload"><FileInput dataAttr="image-reference-upload" /></Field><Field label="Aspect / size"><Select value={values.imageSize} onChange={setters.setImageSize} options={['1024x1024', '768x1024', '1024x768', '1536x1024']} /></Field><Field label="Style"><Input value={values.imageStyle} onChange={setters.setImageStyle} /></Field><Field label="Number of images"><Select value={values.imageCount} onChange={setters.setImageCount} options={['1', '2', '4']} /></Field><Field label="Edit mode"><Select value="generate" onChange={() => undefined} options={['generate', 'edit reference image']} /></Field></ControlGrid>
  }
  if (task === 'video') {
    return <ControlGrid><Field label="Reference image upload"><FileInput dataAttr="video-reference-upload" /></Field><Field label="Target duration"><Select value={values.videoDuration} onChange={setters.setVideoDuration} options={['30s', '1m30s', '3m', '5m']} /></Field><Field label="Aspect"><Select value={values.videoFormat} onChange={setters.setVideoFormat} options={['16:9', '9:16', '1:1']} /></Field><Field label="Style"><Input value={values.videoStyle} onChange={setters.setVideoStyle} /></Field><Field label="Number of videos"><Select value={values.videoCount} onChange={setters.setVideoCount} options={['1', '2', '3']} /></Field></ControlGrid>
  }
  if (task === 'long-video') {
    return <ControlGrid><Field label="Scene count"><Select value={values.sceneCount} onChange={setters.setSceneCount} options={['4', '6', '8', '12']} /></Field><Field label="Target duration"><Select value={values.videoDuration} onChange={setters.setVideoDuration} options={['1m30s', '3m', '5m', '10m']} /></Field><Field label="Voice toggle"><Select value={values.longVideoVoice} onChange={setters.setLongVideoVoice} options={['on', 'off']} /></Field><Field label="Music toggle"><Select value={values.longVideoMusic} onChange={setters.setLongVideoMusic} options={['on', 'off']} /></Field><Field label="Stitching option"><Select value={values.longVideoStitching} onChange={setters.setLongVideoStitching} options={['on', 'off']} /></Field></ControlGrid>
  }
  if (task === 'music') {
    const genreOptions = ['', 'cinematic pop', 'pop', 'cinematic', 'gospel', 'rnb', 'reggae', 'rock', 'rap', 'ambient', 'afrobeats', 'amapiano', 'edm', 'jazz']
    return <ControlGrid><Field label="Genre 1"><Select value={values.musicGenre} onChange={setters.setMusicGenre} options={genreOptions.filter(Boolean)} /></Field><Field label="Genre 2"><Select value={values.musicGenre2} onChange={setters.setMusicGenre2} options={genreOptions} /></Field><Field label="Genre 3"><Select value={values.musicGenre3} onChange={setters.setMusicGenre3} options={genreOptions} /></Field><Field label="Genre 4"><Select value={values.musicGenre4} onChange={setters.setMusicGenre4} options={genreOptions} /></Field><Field label="Genre 5"><Select value={values.musicGenre5} onChange={setters.setMusicGenre5} options={genreOptions} /></Field><Field label="Mood"><Select value={values.musicMood} onChange={setters.setMusicMood} options={['uplifting', 'calm', 'dramatic', 'romantic', 'dark', 'energetic', 'nostalgic']} /></Field><Field label="Instrumental / vocal"><Select value={values.musicVocals} onChange={setters.setMusicVocals} options={['instrumental_only', 'female_lead', 'male_lead', 'choir', 'rap', 'spoken_word']} /></Field><Field label="BPM"><Input value={values.musicBpm} onChange={setters.setMusicBpm} /></Field><Field label="Language"><Input value={values.musicLanguage} onChange={setters.setMusicLanguage} /></Field><Field label="Duration"><Select value={values.musicDuration} onChange={setters.setMusicDuration} options={['180s', '240s', '300s', '360s']} /></Field><Field label="Number of songs"><Select value={values.musicCount} onChange={setters.setMusicCount} options={['1', '2', '3', '4']} /></Field><Field label="Intro"><Input value={values.musicIntro} onChange={setters.setMusicIntro} /></Field><Field label="Verse"><Input value={values.musicVerse} onChange={setters.setMusicVerse} /></Field><Field label="Chorus"><Input value={values.musicChorus} onChange={setters.setMusicChorus} /></Field><Field label="Bridge"><Input value={values.musicBridge} onChange={setters.setMusicBridge} /></Field><Field label="Outro"><Input value={values.musicOutro} onChange={setters.setMusicOutro} /></Field><Field label="Music-video handoff"><Select value={values.musicVideoEnabled} onChange={setters.setMusicVideoEnabled} options={['off', 'on']} /></Field><Field label="Visual style"><Input value={values.musicVideoVisualStyle} onChange={setters.setMusicVideoVisualStyle} /></Field><Field label="Story concept"><Input value={values.musicVideoStoryConcept} onChange={setters.setMusicVideoStoryConcept} /></Field><Field label="Video aspect"><Select value={values.musicVideoAspectRatio} onChange={setters.setMusicVideoAspectRatio} options={['16:9', '9:16', '1:1']} /></Field><Field label="Video duration target"><Select value={values.musicVideoDuration} onChange={setters.setMusicVideoDuration} options={['180s', '240s', '300s', '360s']} /></Field><Field label="Video scene count"><Select value={values.musicVideoSceneCount} onChange={setters.setMusicVideoSceneCount} options={['4', '6', '8', '12']} /></Field><Field label="Lyrics textarea"><textarea value={values.lyrics} onChange={(event) => setters.setLyrics(event.target.value)} rows={3} className="dashboard-input min-h-24 resize-y" /></Field></ControlGrid>
  }
  if (task === 'tts') {
    return <ControlGrid><Field label="Voice selector"><Select value={values.voiceStyle} onChange={setters.setVoiceStyle} options={['AmarktAI Neutral', 'AmarktAI Warm', 'AmarktAI Premium', 'Calm Operator']} /></Field><Field label="Speed / style"><Select value={values.voiceSpeed} onChange={setters.setVoiceSpeed} options={['slow', 'normal', 'fast']} /></Field><Field label="Voice sample upload"><FileInput dataAttr="voice-clone-upload" /></Field><Field label="Clone name"><Input value={values.voiceCloneName} onChange={setters.setVoiceCloneName} placeholder="Disabled until clone route exists" /></Field><Field label="Consent / rights"><Select value={values.voiceCloneConsent} onChange={setters.setVoiceCloneConsent} options={['no', 'yes']} /></Field><Field label="Test phrase"><Input value={values.voiceClonePhrase} onChange={setters.setVoiceClonePhrase} /></Field><div className="md:col-span-3 rounded-xl border border-amber-300/20 bg-amber-300/8 p-3 text-xs font-bold text-amber-200">Voice clone save is disabled: missing route `/api/admin/voice/clone`.</div></ControlGrid>
  }
  if (task === 'stt') {
    return <ControlGrid><Field label="Audio upload"><input type="file" accept="audio/*" data-studio-upload="stt-audio" onChange={(event) => setSttFile(event.target.files?.[0] ?? null)} className="block w-full text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-xs file:font-black file:text-slate-200" /></Field><Field label="Transcript output"><Input value="/api/admin/studio/stt saves transcript artifacts" readOnly /></Field></ControlGrid>
  }
  if (task === 'avatar') {
    return <ControlGrid><Field label="Avatar library"><Select value={values.avatarLibrary} onChange={setters.setAvatarLibrary} options={['default', 'brand-library', 'app-library']} /></Field><Field label="Create avatar"><button type="button" className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-black text-slate-200">Create avatar</button></Field><Field label="Reference image upload"><FileInput dataAttr="avatar-reference-upload" /></Field><Field label="Voice selector"><Select value={values.voiceStyle} onChange={setters.setVoiceStyle} options={['AmarktAI Neutral', 'AmarktAI Warm', 'Calm Operator']} /></Field><Field label="Image / video mode"><Select value={values.avatarMode} onChange={setters.setAvatarMode} options={['image', 'video']} /></Field><Field label="Consistency toggle"><Select value={values.avatarConsistency} onChange={setters.setAvatarConsistency} options={['on', 'off']} /></Field></ControlGrid>
  }
  if (task === 'research') {
    return <ControlGrid><Field label="URL input for scrape"><Input value={values.sourceUrl} onChange={setters.setSourceUrl} placeholder="https://..." /></Field><Field label="Document upload"><FileInput dataAttr="rag-document-upload" /></Field><Field label="Mode"><Select value="query" onChange={() => undefined} options={['scrape', 'ingest', 'query']} /></Field><Field label="Result preview"><Input value="Preview appears in the chat/output panel" readOnly /></Field></ControlGrid>
  }
  if (task === 'campaign') {
    return <ControlGrid><Field label="App / brand context"><Input value={values.appSlug} onChange={setters.setAppSlug} /></Field><Field label="Days"><Select value={values.campaignDays} onChange={setters.setCampaignDays} options={['7', '14', '30', '60']} /></Field><Field label="Channels"><Input value={values.campaignChannels} onChange={setters.setCampaignChannels} /></Field><Field label="Asset type selector"><Input value={values.campaignAssetTypes} onChange={setters.setCampaignAssetTypes} /></Field></ControlGrid>
  }
  return null
}

function ControlGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/55 p-3 md:grid-cols-3">{children}</div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</span><span className="mt-1.5 block">{children}</span></label>
}

function Input({ value, onChange, placeholder, readOnly }: { value: string; onChange?: (value: string) => void; placeholder?: string; readOnly?: boolean }) {
  return <input value={value} readOnly={readOnly} placeholder={placeholder} onChange={(event) => onChange?.(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-400/50" />
}

function Select({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-400/50">{options.map((option) => <option key={option}>{option}</option>)}</select>
}

function FileInput({ dataAttr }: { dataAttr: string }) {
  return <input type="file" data-studio-upload={dataAttr} className="block w-full text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-xs file:font-black file:text-slate-200" />
}

function Proof({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-950/55 px-3 py-2"><p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 break-words text-xs font-bold text-slate-300">{value}</p></div>
}

function ProofLink({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-950/55 px-3 py-2"><p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p><a href={value} target="_blank" rel="noreferrer" className="mt-1 block break-words text-xs font-bold text-cyan-200 hover:text-cyan-100">{value}</a></div>
}

function summarizeResult(data: Record<string, unknown>) {
  const result = toRecord(data.result)
  const artifact = toRecord(data.artifact)
  if (typeof data.output === 'string') return data.output
  if (typeof result?.output === 'string') return result.output
  if (typeof result?.text === 'string') return result.text
  if (typeof data.artifactId === 'string') return `Artifact saved: ${data.artifactId}`
  if (typeof artifact?.id === 'string') return `Artifact saved: ${artifact.id}`
  if (typeof data.pollUrl === 'string') return `Job created: ${data.pollUrl}`
  return 'Execution completed. Check Assets & Jobs for saved references.'
}

function normalizeStudioResult(data: Record<string, unknown>, taskId: TaskId): StudioResult {
  const result = toRecord(data.result)
  const artifact = toRecord(data.artifact)
  const job = toRecord(data.job)
  const rawState = data.jobStatus ?? data.status ?? result?.status
  let status = normalizeExecutionState(rawState)
  const mediaType = taskId === 'image'
    ? 'image'
    : taskId === 'music'
      ? 'music'
      : taskId === 'video' || taskId === 'long-video'
        ? 'video'
        : undefined
  const artifactId = firstString(data.artifactId, artifact?.id, result?.artifactId)
  const artifactUrl = firstString(data.storageUrl, data.mediaUrl, artifact?.storageUrl, result?.storageUrl)
  const outputUrl = firstString(data.output, data.imageUrl, data.musicUrl, data.audioUrl, data.mediaUrl, data.storageUrl, result?.output, result?.imageUrl, result?.musicUrl, result?.audioUrl, result?.mediaUrl)
  const jobUrl = firstString(data.pollUrl, job?.pollUrl, result?.pollUrl)
  const blocker = firstString(data.blocker, data.error, result?.blocker, result?.error)

  if (['image', 'music'].includes(taskId) && status === 'completed' && !artifactId && !outputUrl) {
    status = 'failed'
  }

  return {
    text: status === 'processing'
      ? `Job submitted: ${jobUrl ?? 'polling active'}`
      : status === 'failed'
        ? blocker ?? summarizeResult(data)
        : summarizeResult(data),
    status,
    mediaType,
    provider: firstString(data.selectedProvider, data.provider, result?.selectedProvider, result?.provider),
    model: firstString(data.selectedModel, data.model, result?.selectedModel, result?.model),
    artifactId,
    artifactUrl,
    jobUrl,
    outputUrl,
    blocker: status === 'failed'
      ? blocker ?? (['image', 'music'].includes(taskId) ? 'Job completed but no artifact was returned/saved.' : undefined)
      : blocker,
  }
}

function normalizeExecutionState(value: unknown): StudioExecutionState {
  const status = String(value ?? '').toLowerCase().replaceAll('_', '-')
  if (['queued', 'pending', 'processing', 'running', 'in-progress'].includes(status)) return 'processing'
  if (['submitted', 'accepted'].includes(status)) return 'submitted'
  if (['completed', 'complete', 'succeeded', 'success', 'generated'].includes(status)) return 'completed'
  if (['failed', 'error', 'cancelled', 'canceled', 'timed-out', 'timeout'].includes(status)) return 'failed'
  if (status === 'validating') return 'validating'
  return 'completed'
}

function labelState(value: StudioExecutionState) {
  if (value === 'idle') return 'Idle'
  if (value === 'validating') return 'Validating'
  if (value === 'submitted') return 'Submitted'
  if (value === 'processing') return 'Processing'
  if (value === 'failed') return 'Failed'
  return 'Completed'
}

function upsertActiveJob(current: ActiveStudioJob[], next: ActiveStudioJob) {
  const existing = current.filter((job) => job.id !== next.id)
  return [next, ...existing].slice(0, 8)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null
}

function firstString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === 'string' && value.length > 0)
}
