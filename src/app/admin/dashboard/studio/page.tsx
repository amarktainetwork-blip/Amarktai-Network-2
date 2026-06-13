'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  RotateCcw,
  Send,
  Upload,
  XCircle,
} from 'lucide-react'

type AppOption = { slug: string; name: string }
type SafetyPolicy = { safeMode: boolean; adultMode: boolean; suggestiveMode: boolean }
type CapabilityTruth = { capability: string; status: string; blocker?: string | null }
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

const capabilities = [
  ['image_generation', 'Image'],
  ['image_edit', 'Image edit'],
  ['suggestive_image', 'Suggestive image'],
  ['music_generation', 'Music / song'],
  ['lyrics_generation', 'Lyrics'],
  ['tts', 'TTS / voice'],
  ['stt', 'STT / transcription'],
  ['video_generation', 'Video'],
  ['avatar_video', 'Avatar / talking video'],
  ['adult_image', 'Adult image'],
  ['adult_video', 'Adult video'],
  ['adult_voice', 'Adult voice'],
] as const

const activeStatuses = new Set(['planned', 'queued', 'running'])

export default function StudioPage() {
  const [apps, setApps] = useState<AppOption[]>([])
  const [appSlug, setAppSlug] = useState('amarktai-network')
  const [policy, setPolicy] = useState<SafetyPolicy>({ safeMode: true, adultMode: false, suggestiveMode: false })
  const [capabilityTruth, setCapabilityTruth] = useState<CapabilityTruth[]>([])
  const [capability, setCapability] = useState('image_generation')
  const [prompt, setPrompt] = useState('')
  const [source, setSource] = useState('')
  const [sourceArtifact, setSourceArtifact] = useState<Artifact | null>(null)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [style, setStyle] = useState('cinematic')
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [quality, setQuality] = useState('standard')
  const [qualityTier, setQualityTier] = useState<'cheap' | 'balanced' | 'premium' | 'auto'>('auto')
  const [duration, setDuration] = useState(4)
  const [scenePlanOnly, setScenePlanOnly] = useState(false)
  const [genre, setGenre] = useState('cinematic')
  const [genres, setGenres] = useState<string[]>(['cinematic'])
  const [mood, setMood] = useState('uplifting')
  const [vocalStyle, setVocalStyle] = useState('female_lead')
  const [instrumental, setInstrumental] = useState(false)
  const [language, setLanguage] = useState('English')
  const [voiceId, setVoiceId] = useState('auto')
  const [lyrics, setLyrics] = useState('')
  const [active, setActive] = useState<StudioRun | null>(null)
  const [history, setHistory] = useState<StudioRun[]>([])
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadHistory = useCallback(async () => {
    const response = await fetch('/api/admin/studio/execute?limit=30', { cache: 'no-store' })
    const data = await response.json().catch(() => ({}))
    if (response.ok) setHistory(data.runs ?? [])
  }, [])

  const loadArtifacts = useCallback(async () => {
    const response = await fetch(`/api/admin/artifacts?appSlug=${encodeURIComponent(appSlug)}&status=completed&limit=50`, { cache: 'no-store' })
    const data = await response.json().catch(() => ({}))
    if (response.ok) setArtifacts(data.artifacts ?? [])
  }, [appSlug])

  useEffect(() => {
    fetch('/api/admin/apps', { cache: 'no-store' }).then((response) => response.json()).then((data) => {
      const values = Array.isArray(data) ? data : data.apps ?? []
      setApps(values)
    }).catch(() => null)
    fetch('/api/admin/ai-routing', { cache: 'no-store' }).then((response) => response.json()).then((data) => {
      setCapabilityTruth(Array.isArray(data.mediaCapabilities) ? data.mediaCapabilities : [])
    }).catch(() => null)
    loadHistory()
  }, [loadHistory])

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/app-safety?appSlug=${encodeURIComponent(appSlug)}`, { cache: 'no-store' }).then((response) => response.json()),
      loadArtifacts(),
    ]).then(([data]) => {
      setPolicy({
        safeMode: data.safeMode !== false,
        adultMode: Boolean(data.adultMode),
        suggestiveMode: Boolean(data.suggestiveMode),
      })
    }).catch(() => setPolicy({ safeMode: true, adultMode: false, suggestiveMode: false }))
  }, [appSlug, loadArtifacts])

  useEffect(() => {
    if (!active || !activeStatuses.has(active.status)) return
    const timer = window.setInterval(async () => {
      if (active.job?.pollUrl) await fetch(active.job.pollUrl, { cache: 'no-store' }).catch(() => null)
      const response = await fetch(`/api/admin/studio/execute?executionId=${encodeURIComponent(active.executionId)}`, { cache: 'no-store' })
      if (!response.ok) return
      const run = await response.json()
      setActive(run)
      setHistory((items) => [run, ...items.filter((item) => item.executionId !== run.executionId)])
      if (!activeStatuses.has(run.status)) loadArtifacts()
    }, 3000)
    return () => window.clearInterval(timer)
  }, [active, loadArtifacts])

  async function run(executionId?: string) {
    if (!executionId && capability === 'stt') return runStt()
    if (!executionId && !prompt.trim()) return
    setLoading(true)
    setError('')
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
        }),
      })
      const data = await response.json()
      if (!response.ok && !data.executionId) throw new Error(data.error || 'Media Studio execution failed')
      setActive(data)
      setHistory((items) => [data, ...items.filter((item) => item.executionId !== data.executionId)])
      if (!executionId) setPrompt('')
      await loadArtifacts()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Media Studio execution failed')
    } finally {
      setLoading(false)
    }
  }

  async function runStt() {
    if (!audioFile) {
      setError('Select an audio file before transcription.')
      return
    }
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
      if (!response.ok && !data.executionId) throw new Error(data.error || 'Transcription failed')
      setActive(data)
      setHistory((items) => [data, ...items.filter((item) => item.executionId !== data.executionId)])
      await loadArtifacts()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Transcription failed')
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
    if (capability === 'suggestive_image' && (policy.safeMode || !policy.suggestiveMode)) {
      return 'Suggestive media requires explicit app opt-in with safe mode disabled.'
    }
    return ''
  }, [capability, policy])
  const isImage = capability.includes('image')
  const isMusic = capability === 'music_generation' || capability === 'lyrics_generation'
  const isVoice = capability === 'tts' || capability === 'adult_voice'
  const isVideo = capability.includes('video')
  const truthCapability = capability === 'suggestive_image'
    ? 'image_generation'
    : capability === 'lyrics_generation'
      ? 'music_generation'
      : capability
  const runtimeTruth = capabilityTruth.find((entry) => entry.capability === truthCapability)

  return (
    <div className="space-y-5">
      <header className="rounded-3xl border border-fuchsia-400/20 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,.13),transparent_42%)] p-5 lg:p-7">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-fuchsia-300">Media Studio</p>
        <h1 className="mt-2 text-3xl font-black text-white">Production media factory.</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Create media through AmarktAI capabilities and keep every completed output in the canonical artifact library.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Field label="App context"><select value={appSlug} onChange={(event) => setAppSlug(event.target.value)} className="control">{apps.length === 0 && <option value="amarktai-network">AmarktAI</option>}{apps.map((app) => <option key={app.slug} value={app.slug}>{app.name}</option>)}</select></Field>
          <Field label="Media type"><select value={capability} onChange={(event) => setCapability(event.target.value)} className="control">{capabilities.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          <Fact label="App policy" value={policy.adultMode ? 'Adult mode opted in' : policy.suggestiveMode ? 'Suggestive mode opted in' : 'Safe mode'} />
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)_320px]">
        <aside className="space-y-4">
          <Panel title="Input">
            {capability !== 'stt' && <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={7} placeholder={placeholder(capability)} className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none" />}
            {capability === 'stt' && <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-600 p-4 text-sm text-slate-300"><Upload className="h-4 w-4" /><span>{audioFile?.name ?? 'Choose audio file'}</span><input type="file" accept="audio/*" className="hidden" onChange={(event) => setAudioFile(event.target.files?.[0] ?? null)} /></label>}
            {(capability === 'image_edit' || isVideo) && <Field label="Source artifact, image, or reference"><input value={source} onChange={(event) => { setSource(event.target.value); setSourceArtifact(null) }} placeholder="artifact:id, URL, or existing reference" className="control" /></Field>}
            {sourceArtifact && <button onClick={() => { setSourceArtifact(null); setSource('') }} className="rounded-full border border-fuchsia-400/25 bg-fuchsia-400/10 px-3 py-1.5 text-xs font-bold text-fuchsia-200">Using {sourceArtifact.title} x</button>}
            {policyBlocker && <ErrorPanel message={policyBlocker} />}
            <button onClick={() => run()} disabled={loading || Boolean(policyBlocker) || (capability === 'stt' ? !audioFile : !prompt.trim())} className="flex w-full items-center justify-center gap-2 rounded-xl bg-fuchsia-300 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-40">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Run media task</button>
            {error && <ErrorPanel message={error} />}
          </Panel>

          <Panel title="Parameters">
            <Field label="Routing quality"><select value={qualityTier} onChange={(event) => setQualityTier(event.target.value as typeof qualityTier)} className="control"><option value="auto">Auto / mixed</option><option value="cheap">Cheap</option><option value="balanced">Balanced</option><option value="premium">Premium</option></select></Field>
            {isImage && <><Field label="Style"><input value={style} onChange={(event) => setStyle(event.target.value)} className="control" /></Field><div className="grid grid-cols-2 gap-2"><Field label="Aspect"><select value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)} className="control"><option>1:1</option><option>16:9</option><option>9:16</option></select></Field><Field label="Quality"><select value={quality} onChange={(event) => setQuality(event.target.value)} className="control"><option value="standard">Standard</option><option value="high">High</option></select></Field></div></>}
            {isMusic && <><Field label="Genres / style blend"><select multiple value={genres} onChange={(event) => { const values = Array.from(event.target.selectedOptions, (option) => option.value).slice(0, 5); setGenres(values); setGenre(values[0] ?? 'cinematic') }} className="control min-h-32"><option>cinematic</option><option>pop</option><option>rock</option><option value="hip_hop">Hip hop</option><option>folk</option><option>amapiano</option><option>afrobeats</option><option>ambient</option></select></Field><p className="text-[11px] text-slate-500">Select up to five styles. The backend blends them in the order selected.</p><Field label="Mood"><input value={mood} onChange={(event) => setMood(event.target.value)} className="control" /></Field><Field label="Vocal style"><select value={vocalStyle} onChange={(event) => setVocalStyle(event.target.value)} className="control"><option value="female_lead">Female lead</option><option value="male_lead">Male lead</option><option>choir</option><option>rap</option><option value="spoken_word">Spoken word</option></select></Field><Toggle label="Instrumental" checked={instrumental} onChange={setInstrumental} />{capability === 'music_generation' && <Field label="Existing lyrics"><textarea value={lyrics} onChange={(event) => setLyrics(event.target.value)} rows={3} className="control" /></Field>}</>}
            {(isVoice || capability === 'stt') && <><Field label="Language"><input value={language} onChange={(event) => setLanguage(event.target.value)} className="control" /></Field>{isVoice && <Field label="Voice / style"><input value={voiceId} onChange={(event) => setVoiceId(event.target.value)} className="control" /></Field>}</>}
            {isVideo && <><Field label="Video style"><select value={style} onChange={(event) => setStyle(event.target.value)} className="control"><option>cinematic</option><option>animated</option><option>realistic</option><option>documentary</option><option>commercial</option></select></Field><div className="grid grid-cols-2 gap-2"><Field label="Duration"><input type="number" min={1} max={30} value={duration} onChange={(event) => setDuration(Number(event.target.value))} className="control" /></Field><Field label="Aspect"><select value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)} className="control"><option>16:9</option><option>9:16</option><option>1:1</option></select></Field></div>{capability === 'video_generation' && <Toggle label="Scene plan only" checked={scenePlanOnly} onChange={setScenePlanOnly} />}</>}
          </Panel>

          <Panel title="Capability readiness">
            <Fact label="Runtime truth" value={capability === 'image_edit' ? 'UNAVAILABLE - source adapter missing' : runtimeTruth?.status === 'available' ? 'READY' : runtimeTruth?.blocker ?? 'Readiness will be verified at execution time'} />
            <p className="text-xs leading-5 text-slate-400">AmarktAI selects infrastructure automatically after validating this capability.</p>
          </Panel>
        </aside>

        <main className="space-y-4">
          {!active && <section className="grid min-h-80 place-items-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 text-center text-slate-400">Your route plan, progress, and media output appear here.</section>}
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
            {active.error && <ErrorPanel message={active.error} />}
            <Panel title="Artifact result">
              {active.artifacts.length === 0 && <p className="text-sm text-slate-400">{active.status === 'queued' ? 'Output pending. No completed artifact exists yet.' : 'No completed artifact is available.'}</p>}
              <div className="grid gap-3 md:grid-cols-2">{active.artifacts.map((artifact) => <ArtifactCard key={artifact.id} artifact={artifact} onReuse={reuseArtifact} />)}</div>
            </Panel>
          </>}
        </main>

        <aside className="space-y-4 xl:col-span-2 2xl:col-span-1">
          <Panel title="Media job history">
            <button onClick={loadHistory} className="flex items-center gap-2 text-xs font-black text-fuchsia-300"><RefreshCw className="h-3.5 w-3.5" />Refresh</button>
            <div className="space-y-2">{history.length === 0 && <p className="text-xs text-slate-400">No Studio executions yet.</p>}{history.map((runItem) => <button key={runItem.executionId} onClick={() => setActive(runItem)} className="block w-full rounded-xl border border-slate-700/50 bg-slate-950/40 p-3 text-left"><p className="truncate text-xs font-bold text-slate-200">{runItem.execution.input.prompt}</p><p className="mt-1 text-[10px] font-black uppercase tracking-wide text-slate-500">{friendly(runItem.capability)} / {friendly(runItem.status)}</p></button>)}</div>
          </Panel>
          <Panel title="Reusable artifacts">
            <div className="max-h-96 space-y-2 overflow-auto">{artifacts.length === 0 && <p className="text-xs text-slate-400">No completed app artifacts.</p>}{artifacts.map((artifact) => <button key={artifact.id} onClick={() => reuseArtifact(artifact)} className="block w-full rounded-xl border border-slate-700/50 p-3 text-left"><p className="truncate text-xs font-bold text-slate-200">{artifact.title}</p><p className="mt-1 text-[10px] uppercase text-slate-500">{friendly(artifact.type)}</p></button>)}</div>
          </Panel>
          <div className="grid grid-cols-2 gap-2"><SummaryLink href="/admin/dashboard/artifacts" label="Artifacts" /><SummaryLink href="/admin/dashboard/jobs" label="Jobs" /></div>
        </aside>
      </div>
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

function placeholder(capability: string) {
  if (capability === 'image_edit') return 'Describe the edit to apply to the source image...'
  if (capability === 'lyrics_generation') return 'Describe the song theme and lyrical direction...'
  if (capability === 'tts' || capability === 'adult_voice') return 'Enter the text to speak...'
  if (capability.includes('video')) return 'Describe the video, movement, scenes, and visual direction...'
  return 'Describe the media you want to create...'
}
function friendly(value: string) { return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }
