'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Loader2,
  RotateCcw,
  Send,
  Upload,
  XCircle,
} from 'lucide-react'
import {
  DashboardEmptyState,
  DashboardMetricCard,
  DashboardPageHeader,
  DashboardSectionPanel,
} from '@/components/dashboard/DashboardChrome'

type AppOption = { slug: string; name: string }
type SafetyPolicy = { safeMode: boolean; adultMode: boolean; suggestiveMode: boolean }
type AdultCapabilityProfile = {
  globalAvailable: boolean
  capabilities: Record<string, boolean>
  approvedProviders: string[]
}
type CapabilityTruth = {
  id: string
  readiness: string
  blocker?: string | null
  requiredSourceInput?: string | null
  adapterImplemented: boolean
}
type CreativeOption = { id: string; name: string }
type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string }
type VideoProject = {
  id: string
  title: string
  status: string
  progress: number
  finalArtifactId: string | null
  finalVideoUrl: string | null
  error: string | null
  blocker: string | null
  scenes: Array<{ id: string; order: number; prompt: string; status: string; mediaUrl: string | null; error: string | null }>
}
type Artifact = {
  id: string
  title: string
  type: string
  status: string
  previewUrl: string
  downloadUrl: string
  capability: string
}
type StudioRun = {
  executionId: string
  status: string
  readiness: string | null
  capability: string
  providerPlan: { provider: string | null; fallbackProviders: string[]; reason: string }
  modelPlan: { model: string | null; fallbackModels: string[]; task: string | null; costMode: string }
  approval: { required: boolean; status: string; reason: string | null; approvalId: string | null }
  job: { jobId: string; status?: string; pollUrl?: string | null } | null
  jobs: Array<{ jobId: string; status?: string; pollUrl?: string | null }>
  artifacts: Artifact[]
  result: unknown
  error: string | null
  execution: {
    input: { prompt: string; files: string[]; metadata: Record<string, unknown> }
    events: Array<{ id: string; type: string; message: string; level: string }>
  }
}

const TASKS = [
  { id: 'chat', label: 'Chat / text', normal: 'chat', adult: 'adult_text' },
  { id: 'image', label: 'Image', normal: 'image_generation', adult: 'adult_image' },
  { id: 'image_edit', label: 'Image edit', normal: 'image_edit', adult: 'image_edit' },
  { id: 'video', label: 'Video', normal: 'video_generation', adult: 'adult_video' },
  { id: 'music', label: 'Music', normal: 'music_generation', adult: 'music_generation' },
  { id: 'voice', label: 'Voice', normal: 'tts', adult: 'adult_voice' },
  { id: 'avatar', label: 'Avatar', normal: 'avatar_generation', adult: 'adult_avatar' },
] as const

const activeStatuses = new Set(['planned', 'queued', 'running'])

export default function StudioPage() {
  const [apps, setApps] = useState<AppOption[]>([])
  const [appSlug, setAppSlug] = useState('amarktai-network')
  const [policy, setPolicy] = useState<SafetyPolicy>({ safeMode: true, adultMode: false, suggestiveMode: false })
  const [adultProfile, setAdultProfile] = useState<AdultCapabilityProfile>({
    globalAvailable: false,
    capabilities: {},
    approvedProviders: [],
  })
  const [capabilityTruth, setCapabilityTruth] = useState<CapabilityTruth[]>([])
  const [task, setTask] = useState<(typeof TASKS)[number]['id']>('image')
  const [mode, setMode] = useState<'normal' | 'adult'>('normal')
  const [projects, setProjects] = useState<CreativeOption[]>([])
  const [brandKits, setBrandKits] = useState<CreativeOption[]>([])
  const [projectId, setProjectId] = useState('')
  const [brandKitId, setBrandKitId] = useState('')
  const [prompt, setPrompt] = useState('')
  const [source, setSource] = useState('')
  const [sourceArtifact, setSourceArtifact] = useState<Artifact | null>(null)
  const [style, setStyle] = useState('cinematic')
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [quality, setQuality] = useState('standard')
  const [qualityTier, setQualityTier] = useState<'cheap' | 'balanced' | 'premium' | 'auto'>('auto')
  const [duration, setDuration] = useState(4)
  const [longForm, setLongForm] = useState(false)
  const [sceneCount, setSceneCount] = useState(0)
  const [tone, setTone] = useState('confident')
  const [scenePlanOnly, setScenePlanOnly] = useState(false)
  const [genre, setGenre] = useState('cinematic')
  const [genres, setGenres] = useState<string[]>(['cinematic'])
  const [mood, setMood] = useState('uplifting')
  const [vocalStyle, setVocalStyle] = useState('female_lead')
  const [instrumental, setInstrumental] = useState(false)
  const [language, setLanguage] = useState('English')
  const [voiceId, setVoiceId] = useState('auto')
  const [voiceFlow, setVoiceFlow] = useState<'tts' | 'stt'>('tts')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [lyrics, setLyrics] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [active, setActive] = useState<StudioRun | null>(null)
  const [videoProject, setVideoProject] = useState<VideoProject | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedCapability = TASKS.find((entry) => entry.id === task)![mode]
  const capability = task === 'voice' && voiceFlow === 'stt' ? 'stt' : selectedCapability

  useEffect(() => {
    fetch('/api/admin/apps', { cache: 'no-store' }).then((response) => response.json()).then((data) => {
      const values = Array.isArray(data) ? data : data.apps ?? []
      setApps(values)
    }).catch(() => null)
    fetch('/api/admin/system/v1-brain-route-matrix', { cache: 'no-store' }).then((response) => response.json()).then((data) => {
      setCapabilityTruth(Array.isArray(data.capabilities) ? data.capabilities : [])
    }).catch(() => null)
    fetch('/api/admin/creative-workspaces', { cache: 'no-store' }).then((response) => response.json()).then((data) => {
      setProjects(data.projects ?? [])
      setBrandKits(data.brandKits ?? [])
    }).catch(() => null)
  }, [])

  useEffect(() => {
    fetch(`/api/admin/app-safety?appSlug=${encodeURIComponent(appSlug)}`, { cache: 'no-store' })
      .then((response) => response.json()).then((data) => {
      setPolicy({
        safeMode: data.safeMode !== false,
        adultMode: Boolean(data.adultMode),
        suggestiveMode: Boolean(data.suggestiveMode),
      })
      setAdultProfile({
        globalAvailable: Boolean(data.adultCapabilities?.globalAvailable),
        capabilities: data.adultCapabilities?.capabilities ?? {},
        approvedProviders: Array.isArray(data.adultCapabilities?.approvedProviders)
          ? data.adultCapabilities.approvedProviders
          : [],
      })
    }).catch(() => setPolicy({ safeMode: true, adultMode: false, suggestiveMode: false }))
  }, [appSlug])

  useEffect(() => {
    if (!active || !activeStatuses.has(active.status)) return
    const timer = window.setInterval(async () => {
      if (active.job?.pollUrl) await fetch(active.job.pollUrl, { cache: 'no-store' }).catch(() => null)
      const response = await fetch(`/api/admin/studio/execute?executionId=${encodeURIComponent(active.executionId)}`, { cache: 'no-store' })
      if (!response.ok) return
      const run = await response.json()
      setActive(run)
    }, 3000)
    return () => window.clearInterval(timer)
  }, [active])

  useEffect(() => {
    if (!videoProject || ['completed', 'failed', 'blocked'].includes(videoProject.status)) return
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/admin/video-projects?id=${encodeURIComponent(videoProject.id)}`, { cache: 'no-store' })
      const data = await response.json()
      if (data.project) setVideoProject(data.project)
    }, 4000)
    return () => window.clearInterval(timer)
  }, [videoProject])

  async function run(executionId?: string) {
    if (!executionId && capability === 'stt') return runStt()
    if (!executionId && !prompt.trim()) return
    if (!executionId && capability === 'video_generation' && longForm) return runLongFormVideo()
    const submittedPrompt = prompt.trim()
    setLoading(true)
    setError('')
    if (!executionId && task === 'chat') {
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: 'user',
        content: submittedPrompt,
      }])
    }
    try {
      const response = await fetch('/api/admin/studio/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(executionId ? { executionId } : {
          appSlug,
          capability,
          prompt,
          source: sourceArtifact ? `artifact:${sourceArtifact.id}` : source || undefined,
          artifactIds: sourceArtifact ? [sourceArtifact.id] : [],
          style,
          aspectRatio,
          quality,
          qualityTier,
          duration,
          scenePlanOnly,
          genre,
          genres,
          moods: mood ? [mood] : [],
          vocalStyle,
          instrumental,
          language,
          voiceId,
          lyrics: lyrics || undefined,
          projectId: projectId || undefined,
          brandKitId: brandKitId || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok && !data.executionId) throw new Error(data.error || 'Media Studio execution failed')
      setActive(data)
      if (!executionId && task === 'chat') {
        const assistantOutput = resultOutput(data.result)
        if (assistantOutput) {
          setMessages((current) => [...current, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: assistantOutput,
          }])
        }
      }
      if (!executionId) setPrompt('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Media Studio execution failed')
    } finally {
      setLoading(false)
    }
  }

  async function runLongFormVideo() {
    setLoading(true)
    setError('')
    setActive(null)
    try {
      const response = await fetch('/api/admin/video-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appSlug,
          title: prompt.slice(0, 80),
          prompt,
          totalDuration: duration,
          aspectRatio,
          style,
          tone,
          sceneCount: sceneCount || undefined,
          brandKitId: brandKitId || undefined,
          qualityTier,
          projectId: projectId || undefined,
          audioReference: source || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.project) throw new Error(data.error || 'Long-form video project could not start')
      setVideoProject(data.project)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Long-form video project could not start')
    } finally {
      setLoading(false)
    }
  }

  async function runStt() {
    if (!audioFile) return
    setLoading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', audioFile)
      form.append('appSlug', appSlug)
      form.append('language', language)
      form.append('qualityTier', qualityTier)
      const response = await fetch('/api/admin/studio/stt', { method: 'POST', body: form })
      const data = await response.json()
      if (!response.ok && !data.executionId) throw new Error(data.error || 'Audio transcription failed')
      setActive(data)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Audio transcription failed')
    } finally {
      setLoading(false)
    }
  }

  async function decideApproval(decision: 'approve' | 'reject') {
    if (!active?.approval.approvalId) return
    setLoading(true)
    const response = await fetch(`/api/admin/approvals/${active.approval.approvalId}/${decision}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(decision === 'approve' ? { note: 'Approved in Media Studio' } : { reason: 'Rejected in Media Studio' }),
    })
    if (response.ok && decision === 'approve') await run(active.executionId)
    else {
      const refreshed = await fetch(`/api/admin/studio/execute?executionId=${active.executionId}`).then((item) => item.json())
      setActive(refreshed)
    }
    setLoading(false)
  }

  async function reuseArtifact(artifact: Artifact) {
    const response = await fetch(`/api/admin/artifacts/${encodeURIComponent(artifact.id)}/reuse`, { method: 'POST' })
    if (!response.ok) {
      const data = await response.json()
      setError(data.error || 'Artifact cannot be reused')
      return
    }
    setSourceArtifact(artifact)
    setSource(`artifact:${artifact.id}`)
  }

  const policyBlocker = useMemo(() => {
    if (capability.startsWith('adult_') && (policy.safeMode || !policy.adultMode)) {
      return 'Adult media requires explicit app opt-in with safe mode disabled.'
    }
    if (capability.startsWith('adult_') && !adultProfile.globalAvailable) {
      return 'Global adult mode availability is disabled.'
    }
    const governedCapability = adultCapabilityKey(capability)
    if (governedCapability && adultProfile.capabilities[governedCapability] === false) {
      return `${friendly(governedCapability)} is disabled for this app.`
    }
    if (capability.startsWith('adult_') && adultProfile.approvedProviders.length === 0) {
      return 'No adult provider is approved for this app.'
    }
    if (capability === 'adult_video') {
      return 'Adult video remains blocked until an approved provider exposes a canonical adult-video execution route.'
    }
    return ''
  }, [adultProfile, capability, policy])
  const isImage = capability.includes('image') || capability.includes('avatar')
  const isMusic = capability === 'music_generation'
  const isVoice = capability === 'tts' || capability === 'stt' || capability === 'adult_voice'
  const isVideo = capability.includes('video')
  const truthCapability = taxonomyCapability(capability)
  const runtimeTruth = capabilityTruth.find((entry) => entry.id === truthCapability)
  const missingRequiredSource = runtimeTruth?.requiredSourceInput && capability !== 'stt' && !sourceArtifact && !source.trim()
  const routeBlocker = missingRequiredSource
    ? `Needs ${runtimeTruth?.requiredSourceInput} input.`
    : runtimeTruth?.readiness === 'adapter_missing'
      ? runtimeTruth.blocker || 'No implemented V1 adapter is available.'
      : runtimeTruth?.readiness === 'provider_config_missing'
        ? runtimeTruth.blocker || 'No configured provider can execute this capability.'
        : runtimeTruth?.readiness === 'blocked'
          ? runtimeTruth.blocker || 'This capability is policy-blocked.'
          : runtimeTruth?.readiness === 'post_launch'
            ? runtimeTruth.blocker || 'This capability is not launch-ready.'
        : ''
  const activeResultMessage = active ? resultMessage(active.result) : ''
  const activeAttempts = active ? resultAttempts(active.result) : []

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow="Studio"
        title="Choose a task and create."
        description="A capability-first creative workspace. Route-matrix truth, safety state, execution progress, and artifacts stay visible while provider selection remains behind the Brain."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard label="Selected task" value={TASKS.find((entry) => entry.id === task)?.label ?? 'Task'} tone="cyan" detail="Creative task family selected for the current run." />
        <DashboardMetricCard label="Mode" value={mode === 'adult' ? 'Adult' : 'Normal'} tone={mode === 'adult' ? 'amber' : 'slate'} detail="Content mode affects safety and route eligibility." />
        <DashboardMetricCard label="Project" value={projectId || 'None'} tone="slate" detail="Optional workspace context attached to the studio run." />
        <DashboardMetricCard label="Brand kit" value={brandKitId || 'None'} tone="slate" detail="Optional brand context applied without changing route selection rules." />
      </div>

      <DashboardSectionPanel title="Studio controls" eyebrow="Capability-first creative surface">
        <div className="flex flex-wrap items-center gap-2">
          {TASKS.map((entry) => (
            <button key={entry.id} onClick={() => setTask(entry.id)} className={`rounded-full border px-3 py-1.5 text-xs font-black ${task === entry.id ? 'border-fuchsia-300/50 bg-fuchsia-300/15 text-fuchsia-100' : 'border-slate-700 text-slate-500'}`}>{entry.label}</button>
          ))}
          <span className="mx-1 h-5 w-px bg-slate-700" />
          <button onClick={() => setMode('normal')} className={`rounded-full border px-3 py-1.5 text-xs font-black ${mode === 'normal' ? 'border-teal-300/50 bg-teal-300/15 text-teal-100' : 'border-slate-700 text-slate-500'}`}>Normal</button>
          <button onClick={() => setMode('adult')} className={`rounded-full border px-3 py-1.5 text-xs font-black ${mode === 'adult' ? 'border-rose-300/50 bg-rose-300/15 text-rose-100' : 'border-slate-700 text-slate-500'}`}>Adult</button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="App context"><select value={appSlug} onChange={(event) => setAppSlug(event.target.value)} className="control">{apps.length === 0 && <option value="amarktai-network">AmarktAI</option>}{apps.map((app) => <option key={app.slug} value={app.slug}>{app.name}</option>)}</select></Field>
          <Field label="Project"><select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="control"><option value="">No project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Field>
          <Field label="Brand kit"><select value={brandKitId} onChange={(event) => setBrandKitId(event.target.value)} className="control"><option value="">No brand kit</option>{brandKits.map((kit) => <option key={kit.id} value={kit.id}>{kit.name}</option>)}</select></Field>
          <Fact label="Content policy" value={policy.adultMode ? 'Adult mode opted in' : policy.suggestiveMode ? 'Suggestive mode opted in' : 'Safe mode'} />
        </div>
      </DashboardSectionPanel>

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <Panel title="Input">
            {capability === 'stt'
              ? <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-dashed border-slate-600 bg-slate-950/60 px-4 py-8 text-center">
                  <Upload className="h-6 w-6 text-fuchsia-300" />
                  <span className="text-sm font-black text-slate-200">{audioFile?.name ?? 'Choose an audio file'}</span>
                  <span className="text-xs text-slate-500">The transcript and its artifact are created by the existing Studio execution route.</span>
                  <input type="file" accept="audio/*" className="sr-only" onChange={(event) => setAudioFile(event.target.files?.[0] ?? null)} />
                </label>
              : <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={7} placeholder={placeholder(capability)} className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none" />}
            {(capability === 'image_edit' || isVideo) && <Field label="Source artifact, image, or reference"><input value={source} onChange={(event) => { setSource(event.target.value); setSourceArtifact(null) }} placeholder="artifact:id, URL, or existing reference" className="control" /></Field>}
            {sourceArtifact && <button onClick={() => { setSourceArtifact(null); setSource('') }} className="rounded-full border border-fuchsia-400/25 bg-fuchsia-400/10 px-3 py-1.5 text-xs font-bold text-fuchsia-200">Using {sourceArtifact.title} x</button>}
            {policyBlocker && <ErrorPanel message={policyBlocker} />}
            {routeBlocker && <ErrorPanel message={routeBlocker} />}
            <button onClick={() => run()} disabled={loading || Boolean(policyBlocker) || Boolean(routeBlocker) || (capability === 'stt' ? !audioFile : !prompt.trim())} className="flex w-full items-center justify-center gap-2 rounded-xl bg-fuchsia-300 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-40">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Run task</button>
            {error && <ErrorPanel message={error} />}
          </Panel>

          <Panel title="Parameters">
            <Field label="Routing quality"><select value={qualityTier} onChange={(event) => setQualityTier(event.target.value as typeof qualityTier)} className="control"><option value="auto">Auto / mixed</option><option value="cheap">Cheap</option><option value="balanced">Balanced</option><option value="premium">Premium</option></select></Field>
            {isImage && <><Field label="Style"><input value={style} onChange={(event) => setStyle(event.target.value)} className="control" /></Field><div className="grid grid-cols-2 gap-2"><Field label="Aspect"><select value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)} className="control"><option>1:1</option><option>16:9</option><option>9:16</option></select></Field><Field label="Quality"><select value={quality} onChange={(event) => setQuality(event.target.value)} className="control"><option value="standard">Standard</option><option value="high">High</option></select></Field></div></>}
            {isMusic && <><Field label="Genres / style blend"><select multiple value={genres} onChange={(event) => { const values = Array.from(event.target.selectedOptions, (option) => option.value).slice(0, 5); setGenres(values); setGenre(values[0] ?? 'cinematic') }} className="control min-h-32"><option>cinematic</option><option>pop</option><option>rock</option><option value="hip_hop">Hip hop</option><option>folk</option><option>amapiano</option><option>afrobeats</option><option>ambient</option></select></Field><p className="text-[11px] text-slate-500">Select up to five styles. The backend blends them in the order selected.</p><Field label="Mood"><input value={mood} onChange={(event) => setMood(event.target.value)} className="control" /></Field><Field label="Vocal style"><select value={vocalStyle} onChange={(event) => setVocalStyle(event.target.value)} className="control"><option value="female_lead">Female lead</option><option value="male_lead">Male lead</option><option>choir</option><option>rap</option><option value="spoken_word">Spoken word</option></select></Field><Toggle label="Instrumental" checked={instrumental} onChange={setInstrumental} />{capability === 'music_generation' && <Field label="Existing lyrics"><textarea value={lyrics} onChange={(event) => setLyrics(event.target.value)} rows={3} className="control" /></Field>}</>}
            {task === 'voice' && <Field label="Voice task"><select value={voiceFlow} onChange={(event) => setVoiceFlow(event.target.value as typeof voiceFlow)} className="control"><option value="tts">Text to speech</option><option value="stt">Speech to text</option></select></Field>}
            {isVoice && <><Field label="Language"><input value={language} onChange={(event) => setLanguage(event.target.value)} className="control" /></Field>{capability !== 'stt' && <Field label="Voice / style"><input value={voiceId} onChange={(event) => setVoiceId(event.target.value)} className="control" /></Field>}</>}
            {isVideo && <><Field label="Video style"><select value={style} onChange={(event) => setStyle(event.target.value)} className="control"><option>cinematic</option><option>animated</option><option>realistic</option><option>documentary</option><option>commercial</option></select></Field><Field label="Tone / mood"><input value={tone} onChange={(event) => setTone(event.target.value)} className="control" /></Field><div className="grid grid-cols-2 gap-2"><Field label="Duration"><input type="number" min={1} max={longForm ? 240 : 30} value={duration} onChange={(event) => setDuration(Number(event.target.value))} className="control" /></Field><Field label="Aspect"><select value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)} className="control"><option>16:9</option><option>9:16</option><option>1:1</option></select></Field></div>{capability === 'video_generation' && <><Toggle label="Long-form / multi-scene" checked={longForm} onChange={(value) => { setLongForm(value); if (value && duration < 90) setDuration(90) }} />{longForm && <Field label="Scene count, 0 = automatic"><input type="number" min={0} max={30} value={sceneCount} onChange={(event) => setSceneCount(Number(event.target.value))} className="control" /></Field>}<Toggle label="Scene plan only" checked={scenePlanOnly} onChange={setScenePlanOnly} /></>}</>}
          </Panel>

          <Panel title="Capability readiness">
            <Fact label="V1 route state" value={friendly(runtimeTruth?.readiness ?? 'Readiness will be verified at execution time')} />
            {runtimeTruth?.blocker && <p className="text-xs leading-5 text-amber-300">{runtimeTruth.blocker}</p>}
            <p className="text-xs leading-5 text-slate-400">AmarktAI selects infrastructure automatically after validating this capability.</p>
          </Panel>
        </aside>

        <main className="space-y-4">
          {task === 'chat' && messages.length > 0 && <Panel title="Conversation">
            <div className="space-y-3">
              {messages.map((message) => <div key={message.id} className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === 'user' ? 'ml-auto bg-fuchsia-300 text-slate-950' : 'border border-slate-700 bg-slate-950/60 text-slate-200'}`}>
                <p className="mb-1 text-[10px] font-black uppercase tracking-wider opacity-60">{message.role}</p>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>)}
            </div>
          </Panel>}
          {!active && !videoProject && <DashboardEmptyState title="No active studio output yet" detail="Prompt results, route truth, job progress, and persisted artifacts appear here once a studio task runs." />}
          {videoProject && <LongFormVideoPanel project={videoProject} />}
          {active && <>
            <section className="grid gap-3 md:grid-cols-2">
              <Panel title="Capability route"><Fact label="Capability" value={friendly(active.capability)} /><Fact label="Quality policy" value={friendly(active.modelPlan.costMode)} /><p className="text-xs leading-5 text-slate-400">AmarktAI selected an available route for this capability and policy.</p></Panel>
              <Panel title="Readiness"><Fact label="Execution status" value={friendly(active.status)} /><Fact label="Capability readiness" value={friendly(active.readiness ?? 'Pending route result')} /><p className="text-xs text-slate-400">Infrastructure selection remains internal and can fall back when a configured route fails.</p></Panel>
            </section>
            <Panel title="Approval">
              {!active.approval.required && <StatusLine kind="ok" title="No approval required" detail="This media action may run automatically." />}
              {active.approval.status === 'pending' && <><StatusLine kind="wait" title="Approval required" detail={active.approval.reason ?? 'Review before execution.'} /><div className="flex gap-2"><button onClick={() => decideApproval('approve')} className="rounded-lg bg-emerald-300 px-3 py-2 text-xs font-black text-slate-950">Approve and run</button><button onClick={() => decideApproval('reject')} className="rounded-lg border border-red-400/30 px-3 py-2 text-xs font-black text-red-200">Reject</button></div></>}
              {active.approval.status === 'approved' && <StatusLine kind="ok" title="Approved" detail="Execution may continue." />}
              {active.approval.status === 'rejected' && <StatusLine kind="error" title="Rejected" detail="No provider execution occurred." />}
            </Panel>
            <Panel title="Execution / job progress"><div className="space-y-3">{active.execution.events.map((event) => <StatusLine key={event.id} kind={event.level === 'error' ? 'error' : event.level === 'warning' ? 'wait' : 'ok'} title={friendly(event.type)} detail={event.message} />)}{active.status === 'queued' && <StatusLine kind="wait" title="Provider job pending" detail="Media Studio will not show a completed artifact until polling returns real media." />}</div></Panel>
            {activeAttempts.length > 0 && <Panel title="Provider attempts"><div className="space-y-3">{activeAttempts.map((attempt, index) => <StatusLine key={`${attempt.provider}:${attempt.model}:${index}`} kind={attempt.status === 'completed' ? 'ok' : 'error'} title={`${attempt.provider} / ${attempt.model || 'automatic'}`} detail={`${attempt.adapter || 'adapter'} - ${attempt.status}${attempt.error ? `: ${attempt.error}` : ''}`} />)}</div></Panel>}
            {active.error && <ErrorPanel message={active.error} />}
            {!active.error && activeResultMessage && <ErrorPanel message={activeResultMessage} />}
            <Panel title="Artifact result">
              {active.artifacts.length === 0 && <p className="text-sm text-slate-400">{active.status === 'queued' ? 'Output pending. No completed artifact exists yet.' : 'No completed artifact is available.'}</p>}
              <div className="grid gap-3 md:grid-cols-2">{active.artifacts.map((artifact) => <ArtifactCard key={artifact.id} artifact={artifact} onReuse={reuseArtifact} />)}</div>
            </Panel>
          </>}
        </main>

      </div>
      <div className="grid grid-cols-2 gap-3"><SummaryLink href="/admin/dashboard/artifacts" label="Open Artifacts" /><SummaryLink href="/admin/dashboard/jobs" label="Open Jobs" /></div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="space-y-3 rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4"><h2 className="font-black text-white">{title}</h2>{children}</section> }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</span><span className="[&_.control]:w-full [&_.control]:rounded-xl [&_.control]:border [&_.control]:border-slate-700 [&_.control]:bg-slate-950 [&_.control]:px-3 [&_.control]:py-2.5 [&_.control]:text-sm [&_.control]:text-slate-200 [&_.control]:outline-none">{children}</span></label> }
function Fact({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-slate-700/40 bg-slate-950/40 p-3"><p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-xs font-semibold text-slate-300">{value}</p></div> }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-950/40 px-3 py-2 text-xs font-semibold text-slate-300"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="accent-fuchsia-300" /></label> }
function ErrorPanel({ message }: { message: string }) { return <div className="flex gap-2 rounded-xl border border-red-400/25 bg-red-400/8 p-3 text-sm text-red-200"><AlertTriangle className="h-4 w-4 shrink-0" />{message}</div> }
function StatusLine({ kind, title, detail }: { kind: 'ok' | 'wait' | 'error'; title: string; detail: string }) { const Icon = kind === 'ok' ? CheckCircle2 : kind === 'wait' ? Clock3 : XCircle; return <div className="flex gap-3"><Icon className={`mt-0.5 h-4 w-4 shrink-0 ${kind === 'ok' ? 'text-fuchsia-300' : kind === 'wait' ? 'text-amber-300' : 'text-red-300'}`} /><div><p className="text-sm font-bold text-slate-200">{title}</p><p className="mt-0.5 text-xs leading-5 text-slate-400">{detail}</p></div></div> }
function SummaryLink({ href, label }: { href: string; label: string }) { return <Link href={href} className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-3 text-xs font-black text-slate-300">{label}<ArrowRight className="mt-3 h-4 w-4" /></Link> }

function ArtifactCard({ artifact, onReuse }: { artifact: Artifact; onReuse: (artifact: Artifact) => void }) {
  return <article className="overflow-hidden rounded-xl border border-slate-700/50 bg-slate-950/45">
    {artifact.type === 'image' && artifact.previewUrl && <Image unoptimized width={640} height={360} src={artifact.previewUrl} alt={artifact.title} className="h-44 w-full object-cover" />}
    {['audio', 'music', 'voice'].includes(artifact.type) && artifact.previewUrl && <audio controls src={artifact.previewUrl} className="w-full p-3" />}
    {artifact.type === 'video' && artifact.previewUrl && <video controls src={artifact.previewUrl} className="h-44 w-full bg-black object-contain" />}
    <div className="p-3"><p className="truncate text-sm font-black text-slate-200">{artifact.title}</p><p className="mt-1 text-[10px] uppercase text-slate-500">{friendly(artifact.type)} / {friendly(artifact.status)}</p><div className="mt-3 flex gap-2"><a href={artifact.previewUrl || artifact.downloadUrl} className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-bold text-slate-300">Open</a><button onClick={() => onReuse(artifact)} className="flex items-center gap-1 rounded-lg bg-fuchsia-300 px-2.5 py-1.5 text-xs font-black text-slate-950"><RotateCcw className="h-3 w-3" />Reuse</button></div></div>
  </article>
}

function LongFormVideoPanel({ project }: { project: VideoProject }) {
  return <section className="space-y-5 rounded-2xl border border-fuchsia-400/20 bg-slate-900/60 p-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-black uppercase tracking-[.18em] text-fuchsia-300">Long-form video project</p><h2 className="mt-2 text-2xl font-black text-white">{project.title}</h2></div>
      <span className="rounded-full border border-fuchsia-400/25 px-3 py-1 text-xs font-black uppercase text-fuchsia-200">{friendly(project.status)}</span>
    </div>
    <div>
      <div className="flex justify-between text-xs font-bold text-slate-400"><span>Production progress</span><span>{project.progress}%</span></div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 to-cyan-300 transition-all" style={{ width: `${project.progress}%` }} /></div>
    </div>
    {project.finalVideoUrl && <video controls preload="metadata" src={project.finalVideoUrl} className="aspect-video w-full rounded-2xl bg-black" />}
    {(project.error || project.blocker) && <ErrorPanel message={project.blocker || project.error || 'Video project paused'} />}
    <div className="grid gap-3 md:grid-cols-2">
      {project.scenes.map((scene) => <article key={scene.id} className="rounded-xl border border-slate-800 bg-slate-950/55 p-3">
        <div className="flex items-center justify-between"><p className="text-xs font-black text-white">Scene {scene.order}</p><span className="text-[10px] font-black uppercase text-cyan-300">{scene.status}</span></div>
        <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500">{scene.prompt}</p>
        {scene.mediaUrl && <video controls preload="metadata" src={scene.mediaUrl} className="mt-3 aspect-video w-full rounded-lg bg-black" />}
        {scene.error && <p className="mt-2 text-xs text-amber-300">{scene.error}</p>}
      </article>)}
    </div>
    {project.finalArtifactId && <Link href="/admin/dashboard/artifacts" className="inline-flex rounded-xl bg-fuchsia-300 px-4 py-2.5 text-sm font-black text-slate-950">Open final artifact</Link>}
  </section>
}

function placeholder(capability: string) {
  if (capability === 'chat') return 'Draft copy, write a campaign brief, or ask for a structured text result...'
  if (capability === 'image_edit') return 'Describe the edit to apply to the source image...'
  if (capability === 'lyrics_generation') return 'Describe the song theme and lyrical direction...'
  if (capability === 'tts' || capability === 'adult_voice') return 'Enter the text to speak...'
  if (capability.includes('video')) return 'Describe the video, movement, scenes, and visual direction...'
  return 'Describe the media you want to create...'
}

function resultMessage(result: unknown): string {
  if (!result || typeof result !== 'object') return ''
  const value = result as Record<string, unknown>
  const direct = [value.error, value.blocker, value.warning]
    .find((item): item is string => typeof item === 'string' && item.trim().length > 0)
  if (direct) return direct
  if (Array.isArray(value.nextActions)) {
    return value.nextActions
      .filter((item): item is string => typeof item === 'string')
      .join(' ')
  }
  return ''
}

function resultOutput(result: unknown): string {
  if (typeof result === 'string') return result
  if (!result || typeof result !== 'object') return ''
  const value = result as Record<string, unknown>
  for (const key of ['output', 'text', 'content', 'message', 'transcript']) {
    if (typeof value[key] === 'string' && value[key].trim()) return value[key]
  }
  return ''
}

function resultAttempts(result: unknown): Array<Record<string, string>> {
  if (!result || typeof result !== 'object') return []
  const attempts = (result as Record<string, unknown>).providerAttempts
  if (!Array.isArray(attempts)) return []
  return attempts.filter((attempt): attempt is Record<string, string> =>
    Boolean(attempt && typeof attempt === 'object'),
  )
}

function taxonomyCapability(capability: string) {
  const map: Record<string, string> = {
    chat: 'chat',
    image_generation: 'text_to_image',
    image_edit: 'image_text_to_image',
    video_generation: 'text_to_video',
    image_to_video: 'image_to_video',
    music_generation: 'music_generation',
    lyrics_generation: 'lyrics_generation',
    tts: 'text_to_speech',
    stt: 'automatic_speech_recognition',
    avatar_video: 'avatar_video',
    adult_image: 'text_to_image',
    adult_video: 'text_to_video',
    adult_voice: 'text_to_speech',
    avatar_generation: 'avatar_generation',
    adult_avatar: 'avatar_generation',
    suggestive_image: 'text_to_image',
  }
  return map[capability] ?? capability
}

function adultCapabilityKey(capability: string) {
  const map: Record<string, string> = {
    adult_text: 'adult_text',
    adult_image: 'adult_image',
    adult_voice: 'adult_voice',
    adult_avatar: 'adult_avatar',
    adult_video: 'adult_short_video',
  }
  return map[capability] ?? null
}

function friendly(value: string) { return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }
