'use client'

import type React from 'react'
import { useState } from 'react'
import { Loader2, Send, Upload } from 'lucide-react'
import { STUDIO_ROUTE_MAP } from '@/lib/studio-route-map'
import type { CostMode } from '@/lib/approved-ai-catalog'
import { CAPABILITY_UI_MODES, type CapabilityUiMode, type CapabilityField } from '@/lib/capability-ui-schema'
import { CAPABILITY_STUDIOS, JOB_LIFECYCLE_STATES, PLANNED_CONNECTED_APPS } from '@/lib/dashboard-control-room'

// ── Types ─────────────────────────────────────────────────────────────────────

type ExecutionState = 'idle' | 'validating' | 'submitted' | 'processing' | 'completed' | 'failed'

type StudioResult = {
  text: string
  status: ExecutionState
  mediaType?: 'image' | 'audio' | 'music' | 'video'
  provider?: string
  model?: string
  artifactId?: string
  artifactUrl?: string
  storageUrl?: string
  jobId?: string
  pollUrl?: string
  jobUrl?: string
  outputUrl?: string
  blocker?: string
  nextAction?: string
  proofStatus?: string
  attempts?: string[]
}

type ActiveJob = {
  id: string
  pollUrl: string
  modeId: string
  status: ExecutionState
  provider?: string
  model?: string
  blocker?: string
}

// ── Mode ribbon is derived from CAPABILITY_UI_MODES — no hardcoded mode list ──

const ALL_MODES = CAPABILITY_UI_MODES.filter((mode) => !mode.adultPrivate)

export default function StudioPage() {
  const [modeId, setModeId] = useState<string>(ALL_MODES[0].id)
  const [prompt, setPrompt] = useState('')
  const [costMode, setCostMode] = useState<CostMode>('balanced')
  const [qualityTier, setQualityTier] = useState('standard')
  const [appSlug] = useState('amarktai-network')
  // Generic controls object keyed by field.id — replaces dozens of individual useState vars
  const [controls, setControls] = useState<Record<string, unknown>>({})
  const [sttFile, setSttFile] = useState<File | null>(null)
  const [referenceImageFile, setReferenceImageFile] = useState<File | null>(null)
  const [result, setResult] = useState<StudioResult | null>(null)
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([])
  const [recentArtifacts, setRecentArtifacts] = useState<StudioResult[]>([])
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState<ExecutionState>('idle')
  const [musicSubSection, setMusicSubSection] = useState('Song')

  const selectedMode = ALL_MODES.find((m) => m.id === modeId) ?? ALL_MODES[0]
  const selectedStudio = resolveStudioForMode(selectedMode.id)
  const routeInfo = STUDIO_ROUTE_MAP[selectedMode.id as keyof typeof STUDIO_ROUTE_MAP]
    ?? STUDIO_ROUTE_MAP['Chat' as keyof typeof STUDIO_ROUTE_MAP]
  const canSubmit = modeId === 'stt' ? Boolean(sttFile) : prompt.trim().length > 0

  function setControl(id: string, value: unknown) {
    setControls((prev) => ({ ...prev, [id]: value }))
  }

  async function submit() {
    if (!canSubmit || running) return
    setRunning(true)
    setStatus('validating')
    setResult(null)
    try {
      if (modeId === 'stt') {
        await runTranscription()
      } else {
        await runCapability()
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Studio execution failed'
      setStatus('failed')
      setResult({ text: msg, status: 'failed', blocker: msg })
    } finally {
      setRunning(false)
    }
  }

  async function runCapability() {
    const resolvedReferenceUrl = await maybeUploadReferenceImage()
    const finalControls = {
      ...controls,
      ...(resolvedReferenceUrl ? { referenceImageUrl: resolvedReferenceUrl } : {}),
    }
    // Runtime selects provider and model — they must not be in the request payload
    const payload = {
      tab: mapModeToTab(modeId),
      mode: modeId,
      capability: selectedMode.requestCapability,
      prompt,
      appSlug,
      costMode,
      qualityTier,
      controls: finalControls,
    }
    const response = await fetch('/api/admin/studio/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await response.json().catch(() => ({})) as Record<string, unknown>
    if (!response.ok || data.success === false) throw new Error(String(data.blocker ?? data.error ?? 'Execution is not wired for this capability'))
    const r = normalizeResult(data, modeId)
    setResult(r)
    setStatus(r.status)
    setPrompt('')
    if (r.artifactId) rememberArtifact(r)
    if (r.status === 'processing' && r.jobUrl) {
      const jobId = r.jobUrl.split('/').filter(Boolean).pop() ?? r.jobUrl
      const job: ActiveJob = { id: jobId, pollUrl: r.jobUrl, modeId, status: 'processing', provider: r.provider, model: r.model }
      setActiveJobs((c) => upsert(c, job))
      void pollJob(job)
    }
  }

  async function runTranscription() {
    if (!sttFile) return
    const form = new FormData()
    form.append('file', sttFile)
    form.append('appSlug', appSlug)
    const response = await fetch('/api/admin/studio/stt', { method: 'POST', body: form })
    const data = await response.json().catch(() => ({})) as Record<string, unknown>
    if (!response.ok || data.success === false) throw new Error(String(data.error ?? 'STT failed'))
    const transcript = typeof (data.result as Record<string, unknown>)?.transcript === 'string'
      ? String((data.result as Record<string, unknown>).transcript)
      : 'Transcript complete.'
    setResult({ text: transcript, status: 'completed', provider: String((data.result as Record<string, unknown>)?.provider ?? ''), model: String((data.result as Record<string, unknown>)?.model ?? ''), artifactId: String((data.artifact as Record<string, unknown>)?.id ?? '') })
    setStatus('completed')
  }

  async function maybeUploadReferenceImage() {
    if (!referenceImageFile || !['image', 'video', 'image_to_video', 'avatar'].includes(modeId)) return controls.referenceImageUrl as string | undefined
    const form = new FormData()
    form.append('file', referenceImageFile)
    form.append('appSlug', appSlug)
    form.append('purpose', modeId)
    const r = await fetch('/api/admin/studio/reference-upload', { method: 'POST', body: form })
    const d = await r.json().catch(() => ({})) as Record<string, unknown>
    if (!r.ok || d.success === false) throw new Error(String(d.error ?? 'Reference image upload failed'))
    const url = String(d.referenceImageUrl ?? d.storageUrl ?? '')
    if (!url) throw new Error('Reference image upload did not return a URL')
    setControl('referenceImageUrl', url)
    return url
  }

  async function pollJob(job: ActiveJob) {
    for (let i = 0; i < 120; i++) {
      await sleep(i === 0 ? 1000 : 3000)
      const r = await fetch(job.pollUrl, { cache: 'no-store' })
      const d = await r.json().catch(() => ({})) as Record<string, unknown>
      const hydrated = normalizeResult(d, job.modeId)
      const next: ExecutionState = hydrated.status === 'submitted' ? 'processing' : hydrated.status
      setActiveJobs((c) => upsert(c, { ...job, status: next, provider: hydrated.provider, model: hydrated.model, blocker: hydrated.blocker }))
      setResult(hydrated)
      setStatus(next)
      if (next === 'completed') { if (hydrated.artifactId) rememberArtifact(hydrated); return }
      if (next === 'failed') return
    }
    const blocker = 'Job timed out.'
    setActiveJobs((c) => upsert(c, { ...job, status: 'failed', blocker }))
    setResult({ text: blocker, status: 'failed', blocker, jobUrl: job.pollUrl })
    setStatus('failed')
  }

  function rememberArtifact(item: StudioResult) {
    if (!item.artifactId) return
    setRecentArtifacts((c) => [item, ...c.filter((a) => a.artifactId !== item.artifactId)].slice(0, 5))
  }

  const musicSubSections = selectedMode.musicSubSections ?? []

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      {/* Header */}
      <section className="rounded-2xl border border-slate-800 bg-[#071019] p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Studio</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white lg:text-4xl">Capability Studio control room</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">
              Shared workbench for capability testing. Apps provide capability requests and asset references; runtime selects provider and model after policy, proof, budget, and validation checks.
            </p>
          </div>
          <div className="flex gap-2">
            <select value={costMode} onChange={(e) => setCostMode(e.target.value as CostMode)} className="studio-select">
              <option value="cheap">Economy</option>
              <option value="balanced">Balanced</option>
              <option value="premium">Premium</option>
            </select>
            <select value={qualityTier} onChange={(e) => setQualityTier(e.target.value)} className="studio-select">
              <option value="standard">Standard</option>
              <option value="preview">Preview</option>
              <option value="high">High quality</option>
            </select>
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/55 p-4 xl:grid-cols-[0.85fr_1.15fr_0.85fr]">
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Capability selector</span>
            <select value={modeId} onChange={(e) => { setModeId(e.target.value); setResult(null); setMusicSubSection('Song') }} className="studio-select w-full">
              {ALL_MODES.map((mode) => <option key={mode.id} value={mode.id}>{mode.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Preset selector</span>
            <select value={String(controls.preset ?? 'default')} onChange={(e) => setControl('preset', e.target.value)} className="studio-select w-full">
              <option value="default">Default capability preset</option>
              <option value="brand_safe">Brand safe</option>
              <option value="fast_preview">Fast preview</option>
              <option value="artifact_proof">Artifact proof</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">App simulation</span>
            <select value={String(controls.appSimulation ?? 'marketing-app')} onChange={(e) => setControl('appSimulation', e.target.value)} className="studio-select w-full">
              {PLANNED_CONNECTED_APPS.map((app) => <option key={app.appId} value={app.appId}>{app.displayName}</option>)}
            </select>
          </label>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-lg font-black text-white">{selectedStudio.displayName}</p>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">{selectedStudio.purpose}</p>
            </div>
            <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[11px] font-black text-amber-100">
              {selectedStudio.proofStatus}
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <MiniSpec title="Capability IDs" values={selectedStudio.capabilityIds} />
            <MiniSpec title="Outputs" values={selectedStudio.supportedOutputs} />
            <MiniSpec title="Apps" values={selectedStudio.appsCanUse} />
          </div>
        </div>

        <div className="space-y-3">
          <InfoBox title="Provider policy" value={selectedStudio.providerPolicy} />
          <InfoBox title="Blocker" value={selectedStudio.currentBlocker || 'No current blocker in metadata.'} />
          <InfoBox title="Run validation" value={selectedStudio.proofStatus === 'blocked' || selectedStudio.proofStatus === 'deferred' ? 'Run is disabled when real execution is blocked or deferred.' : 'Run submits only capability data; no provider/model override fields are sent.'} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <ShellPanel title="Inputs" values={selectedStudio.supportedInputs} />
        <ShellPanel title="Asset references" values={selectedStudio.supportedAssetReferences} />
        <ShellPanel title="Fallback policy" values={selectedStudio.activeProviderIds.map((id) => `${id}: runtime eligible where capability truth permits`)} />
        <ShellPanel title="Job lifecycle" values={[...JOB_LIFECYCLE_STATES]} />
      </section>

      {/* Mode ribbon — derived from CAPABILITY_UI_MODES, not a hardcoded list */}
      <section data-studio-task-selector="true" className="flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/55 p-2">
        {ALL_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            data-studio-mode={mode.id}
            onClick={() => { setModeId(mode.id); setResult(null); setMusicSubSection('Song') }}
            className={[
              'inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-black transition',
              mode.id === modeId
                ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200'
                : 'border-transparent text-slate-500 hover:bg-slate-800 hover:text-slate-300',
            ].join(' ')}
          >
            {mode.shortLabel}
          </button>
        ))}
      </section>

      {/* Music sub-section tabs */}
      {musicSubSections.length > 0 && modeId === 'music' && (
        <section className="flex gap-1.5 overflow-x-auto">
          {musicSubSections.map((sub) => (
            <button
              key={sub}
              type="button"
              onClick={() => setMusicSubSection(sub)}
              className={[
                'shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-black tracking-wide transition',
                sub === musicSubSection
                  ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300'
                  : 'border-slate-700 bg-slate-900 text-slate-500 hover:text-slate-300',
              ].join(' ')}
            >
              {sub}
            </button>
          ))}
        </section>
      )}

      {/* Prompt + controls */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
        <div className="mb-3 flex items-center gap-2">
          <p className="text-sm font-black text-slate-200">{selectedMode.label}</p>
          <span className="ml-auto text-xs text-slate-500">{selectedMode.description}</span>
        </div>

        {/* Schema-driven field renderer */}
        <SchemaFields
          mode={selectedMode}
          controls={controls}
          setControl={setControl}
          setSttFile={setSttFile}
          setReferenceImageFile={setReferenceImageFile}
          musicSubSection={musicSubSection}
        />

        {/* Main prompt input */}
        {modeId !== 'stt' && (
          <div className="mt-3 flex gap-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={selectedMode.fields.find((f) => f.type === 'textarea' && f.id === 'prompt')?.placeholder ?? selectedMode.description}
              rows={4}
              className="min-h-28 flex-1 resize-y rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/50"
            />
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!canSubmit || running || selectedStudio.proofStatus === 'blocked' || selectedStudio.proofStatus === 'deferred'}
              className="grid w-14 shrink-0 place-items-center rounded-2xl bg-cyan-300 text-slate-950 transition hover:bg-cyan-200 disabled:opacity-40"
              aria-label="Run Studio capability"
            >
              {running ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </div>
        )}

        {modeId === 'stt' && (
          <div className="mt-3 flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-300 hover:border-cyan-400/30">
              <Upload className="h-4 w-4 text-cyan-300" />
              {sttFile ? sttFile.name : 'Upload audio file'}
              <input type="file" accept="audio/*" data-studio-upload="stt-audio" className="sr-only" onChange={(e) => setSttFile(e.target.files?.[0] ?? null)} />
            </label>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!sttFile || running || selectedStudio.proofStatus === 'blocked' || selectedStudio.proofStatus === 'deferred'}
              className="rounded-xl bg-cyan-300 px-5 py-2.5 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:opacity-40"
            >
              {running ? 'Transcribing…' : 'Transcribe'}
            </button>
          </div>
        )}

        {status !== 'idle' && (
          <p className="mt-2 text-xs font-bold text-slate-500">{labelState(status)}</p>
        )}
      </section>

      <details className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
        <summary className="cursor-pointer text-sm font-black text-slate-400">Example app request payload</summary>
        <pre className="mt-3 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs leading-5 text-slate-300">
          {JSON.stringify(selectedStudio.exampleAppRequestPayload, null, 2)}
        </pre>
      </details>

      {/* Route details (collapsed) */}
      <details className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
        <summary className="cursor-pointer text-sm font-black text-slate-400">Route details</summary>
        <div className="mt-3 space-y-1.5 text-xs text-slate-500">
          <p><span className="font-bold text-slate-400">Capability:</span> {selectedMode.requestCapability}</p>
          <p><span className="font-bold text-slate-400">Route:</span> {routeInfo?.route ?? selectedMode.knownRoute ?? 'Not wired'}</p>
          <p><span className="font-bold text-slate-400">Status:</span> {routeInfo?.detail ?? selectedMode.statusCapabilityId}</p>
          <p><span className="font-bold text-slate-400">Artifact type:</span> {selectedMode.artifactType ?? 'Not specified'}</p>
        </div>
      </details>

      {/* Result / proof section — BELOW controls, full width, no side panel */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Execution result &amp; proof</p>

        {!result ? (
          <div className="mt-4 text-sm leading-7 text-slate-500">
            <p><span className="font-bold text-slate-400">Provider:</span> Selected by runtime after execution</p>
            <p><span className="font-bold text-slate-400">Model:</span> Selected by runtime after execution</p>
            <p className="mt-2">No execution result yet. Results appear here after a real capability run.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {/* Media preview */}
            {result.outputUrl && result.status === 'completed' && (
              <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
                <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-500">Preview</p>
                {result.mediaType === 'image' ? (
                  <img src={result.outputUrl} alt="Studio result" className="max-h-80 rounded-xl border border-slate-800 object-contain" />
                ) : result.mediaType === 'audio' || result.mediaType === 'music' ? (
                  <audio src={result.outputUrl} controls className="w-full" />
                ) : result.mediaType === 'video' ? (
                  <video src={result.outputUrl} controls className="aspect-video w-full rounded-xl border border-slate-800 bg-black" />
                ) : (
                  <a href={result.outputUrl} target="_blank" rel="noreferrer" className="break-words text-sm font-bold text-cyan-200 hover:text-cyan-100">{result.outputUrl}</a>
                )}
              </div>
            )}

            {/* Proof fields */}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <ProofCard label="Status" value={result.status} />
              <ProofCard label="Provider" value={result.provider ?? 'Runtime selected'} />
              <ProofCard label="Model" value={result.model ?? 'Runtime selected'} />
              {result.proofStatus && <ProofCard label="Proof status" value={result.proofStatus} />}
              {result.artifactId && <ProofCard label="Artifact ID" value={result.artifactId} />}
              {result.storageUrl && <ProofLink label="Storage URL" value={result.storageUrl} />}
              {result.jobId && <ProofCard label="Job ID" value={result.jobId} />}
              {result.pollUrl && <ProofLink label="Poll URL" value={result.pollUrl} />}
              {result.artifactUrl && <ProofLink label="Artifact link" value={result.artifactUrl} />}
              {result.jobUrl && <ProofLink label="Job / poll URL" value={result.jobUrl} />}
              {result.blocker && <ProofCard label="Blocker" value={result.blocker} wide />}
              {result.nextAction && <ProofCard label="Next action" value={result.nextAction} wide />}
            </div>

            {result.attempts?.length ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Fallback attempts</p>
                <ul className="mt-2 space-y-1">
                  {result.attempts.map((a, i) => <li key={i} className="text-xs text-slate-400">{a}</li>)}
                </ul>
              </div>
            ) : null}

            {result.text && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/55 p-4">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Output</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-200">{result.text}</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Active jobs */}
      {activeJobs.length > 0 && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Active jobs</p>
          <div className="mt-3 space-y-2">
            {activeJobs.map((job) => (
              <div key={job.id} className="rounded-xl border border-slate-800 bg-slate-950/55 px-3 py-2">
                <p className="text-xs font-black text-slate-300">{job.modeId}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{labelState(job.status)}</p>
                {job.provider && <p className="mt-1 text-xs text-slate-600">Provider: {job.provider}</p>}
                {job.blocker && <p className="mt-1 text-xs text-rose-200">{job.blocker}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent artifacts */}
      {recentArtifacts.length > 0 && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Recent artifacts</p>
          <div className="mt-3 space-y-2">
            {recentArtifacts.map((a) => (
              <div key={a.artifactId} className="rounded-xl border border-slate-800 bg-slate-950/55 px-3 py-2">
                <p className="text-xs font-black text-slate-300">{a.artifactId}</p>
                {a.artifactUrl && <a href={a.artifactUrl} target="_blank" rel="noreferrer" className="mt-1 block text-xs font-bold text-cyan-200 hover:text-cyan-100">Open artifact</a>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ── Schema-driven field renderer ──────────────────────────────────────────────

function SchemaFields({
  mode,
  controls,
  setControl,
  setSttFile,
  setReferenceImageFile,
  musicSubSection,
}: {
  mode: CapabilityUiMode
  controls: Record<string, unknown>
  setControl: (id: string, value: unknown) => void
  setSttFile: (f: File | null) => void
  setReferenceImageFile: (f: File | null) => void
  musicSubSection: string
}) {
  // For music, only show fields relevant to the active sub-section
  const isMusicSubFilter = mode.id === 'music' && mode.musicSubSections && mode.musicSubSections.length > 0

  // Map music sub-sections to field id prefixes/groups
  const musicSubFieldIds: Record<string, string[]> = {
    'Song': ['theme', 'genre', 'genres_multi', 'subgenre', 'era_decade', 'mood', 'language', 'target_duration', 'track_count', 'quality'],
    'Lyrics': ['lyrics', 'generate_lyrics', 'use_my_lyrics', 'instrumental_only', 'vocal_mode', 'vocal_style', 'singer_gender'],
    'Production': ['bpm', 'key', 'tempo_feel', 'energy_level', 'beat_style', 'drum_pattern', 'bass_style', 'instruments', 'synth_style', 'guitar_style', 'piano_style', 'orchestral', 'mixing_style', 'mastering', 'reference_vibe', 'production_notes'],
    'Structure': ['structure_intro', 'structure_verse', 'structure_pre_chorus', 'structure_chorus', 'structure_bridge', 'structure_breakdown', 'structure_solo', 'structure_outro', 'custom_structure'],
    'Remix / Variations': ['remix', 'remix_style', 'acoustic_version', 'dance_version', 'cinematic_version', 'radio_edit', 'extended_mix', 'instrumental_version', 'stems', 'regenerate_section', 'variation_count'],
    'Video / Outputs': ['cover_art', 'music_video', 'music_video_style', 'music_video_concept', 'music_video_aspect', 'music_video_scenes', 'lyric_video', 'waveform_preview', 'download_artifact', 'license_pdf'],
  }

  const visibleFields = mode.fields.filter((f) => {
    if (f.id === 'prompt') return false // rendered separately
    if (isMusicSubFilter) {
      const allowedIds = musicSubFieldIds[musicSubSection] ?? []
      return allowedIds.includes(f.id)
    }
    if (f.visibleWhen) {
      const [fieldId, expectedValue] = f.visibleWhen.split('=')
      const actual = controls[fieldId]
      return String(actual ?? '') === expectedValue
    }
    return true
  })

  if (visibleFields.length === 0) return null

  return (
    <div className="mb-3 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-3 md:grid-cols-3">
      {visibleFields.map((field) => (
        <FieldRenderer
          key={field.id}
          field={field}
          value={controls[field.id]}
          onChange={(v) => setControl(field.id, v)}
          setSttFile={setSttFile}
          setReferenceImageFile={setReferenceImageFile}
          modeId={mode.id}
        />
      ))}
    </div>
  )
}

function resolveStudioForMode(modeId: string) {
  if (modeId === 'chat') return CAPABILITY_STUDIOS.find((s) => s.id === 'text-chat')!
  if (modeId === 'image') return CAPABILITY_STUDIOS.find((s) => s.id === 'image')!
  if (modeId === 'video' || modeId === 'image_to_video') return CAPABILITY_STUDIOS.find((s) => s.id === 'video')!
  if (modeId === 'long_form_video') return CAPABILITY_STUDIOS.find((s) => s.id === 'long-form-video')!
  if (modeId === 'music') return CAPABILITY_STUDIOS.find((s) => s.id === 'music-song')!
  if (modeId === 'tts' || modeId === 'stt') return CAPABILITY_STUDIOS.find((s) => s.id === 'voice')!
  if (modeId === 'avatar') return CAPABILITY_STUDIOS.find((s) => s.id === 'avatar')!
  if (modeId === 'research_rag') return CAPABILITY_STUDIOS.find((s) => s.id === 'rag-knowledge')!
  if (modeId === 'campaign') return CAPABILITY_STUDIOS.find((s) => s.id === 'scrape-brand')!
  if (modeId === 'automation' || modeId === 'publishing') return CAPABILITY_STUDIOS.find((s) => s.id === 'jobs-artifacts')!
  return CAPABILITY_STUDIOS.find((s) => s.id === 'text-chat')!
}

function MiniSpec({ title, values }: { title: string; values: readonly string[] }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <p className="mt-2 line-clamp-4 text-xs leading-5 text-slate-300">{values.slice(0, 5).join(', ')}</p>
    </div>
  )
}

function InfoBox({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <p className="mt-2 text-xs leading-5 text-slate-300">{value}</p>
    </div>
  )
}

function ShellPanel({ title, values }: { title: string; values: readonly string[] }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">{title}</p>
      <div className="mt-3 flex max-h-40 flex-wrap gap-1.5 overflow-hidden">
        {values.slice(0, 18).map((value) => (
          <span key={value} className="rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-1 text-[10px] font-bold text-slate-400">
            {value}
          </span>
        ))}
      </div>
    </section>
  )
}

function FieldRenderer({
  field,
  value,
  onChange,
  setSttFile,
  setReferenceImageFile,
  modeId,
}: {
  field: CapabilityField
  value: unknown
  onChange: (v: unknown) => void
  setSttFile: (f: File | null) => void
  setReferenceImageFile: (f: File | null) => void
  modeId: string
}) {
  const strVal = String(value ?? field.defaultValue ?? '')
  const boolVal = value === true || value === 'true' || value === 'on'
  const cls = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-400/50'
  const label = (
    <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
      {field.label}{field.required ? ' *' : ''}
    </span>
  )

  if (field.type === 'status') {
    return (
      <label className="block">
        {label}
        <span className="block rounded-xl border border-slate-800 bg-slate-900/55 px-3 py-2 text-xs text-slate-500">
          Status: {field.statusCapabilityId ?? 'check capabilities page'}
        </span>
      </label>
    )
  }

  if (field.type === 'toggle') {
    return (
      <label className="flex cursor-pointer items-center gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{field.label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={boolVal}
          onClick={() => onChange(!boolVal)}
          className={['ml-auto h-5 w-9 rounded-full border transition', boolVal ? 'border-cyan-400/50 bg-cyan-400/20' : 'border-slate-700 bg-slate-900'].join(' ')}
        >
          <span className={['block h-3.5 w-3.5 rounded-full transition-transform', boolVal ? 'translate-x-4 bg-cyan-300' : 'translate-x-0.5 bg-slate-600'].join(' ')} />
        </button>
      </label>
    )
  }

  if (field.type === 'select' && field.options?.length) {
    return (
      <label className="block">
        {label}
        <select value={strVal} onChange={(e) => onChange(e.target.value)} className={cls}>
          {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
    )
  }

  if (field.type === 'multi_select' && field.options?.length) {
    const arrVal = Array.isArray(value) ? value as string[] : []
    return (
      <label className="block">
        {label}
        <select
          multiple
          value={arrVal}
          onChange={(e) => onChange(Array.from(e.target.selectedOptions, (o) => o.value))}
          className={`${cls} min-h-20`}
        >
          {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
    )
  }

  if (field.type === 'textarea') {
    return (
      <label className="block md:col-span-3">
        {label}
        <textarea
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className={`${cls} min-h-20 resize-y`}
        />
        {field.helpText && <span className="mt-1 block text-[10px] text-slate-600">{field.helpText}</span>}
      </label>
    )
  }

  if (field.type === 'number') {
    return (
      <label className="block">
        {label}
        <input type="number" value={strVal} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} className={cls} />
      </label>
    )
  }

  if (field.type === 'duration') {
    return (
      <label className="block">
        {label}
        <input type="text" value={strVal} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder ?? '8s'} className={cls} />
        {field.helpText && <span className="mt-1 block text-[10px] text-slate-600">{field.helpText}</span>}
      </label>
    )
  }

  if (field.type === 'url') {
    const isRefImage = field.id === 'reference_image' || field.id === 'reference_image_url' || field.id === 'referenceImageUrl'
    return (
      <label className="block md:col-span-2">
        {label}
        <input type="url" value={strVal} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder ?? 'https://...'} className={cls} />
        {isRefImage && (
          <label className="mt-1 flex cursor-pointer items-center gap-2 text-[10px] font-bold text-cyan-400">
            <Upload className="h-3 w-3" />
            Upload reference image
            <input
              type="file"
              accept="image/*"
              data-studio-upload={modeId === 'image' ? 'image-reference-upload' : modeId === 'image_to_video' ? 'image-to-video-reference-upload' : 'avatar-reference-upload'}
              className="sr-only"
              onChange={(e) => setReferenceImageFile(e.target.files?.[0] ?? null)}
            />
          </label>
        )}
      </label>
    )
  }

  if (field.type === 'file') {
    return (
      <label className="block">
        {label}
        <input
          type="file"
          data-studio-upload={field.id === 'audio' ? 'stt-audio' : field.id === 'voice' ? 'voice-clone-upload' : `rag-document-upload`}
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null
            if (field.id === 'audio') setSttFile(file)
            else onChange(file?.name ?? '')
          }}
          className="block w-full text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-xs file:font-black file:text-slate-200"
        />
      </label>
    )
  }

  // Default: text input
  return (
    <label className="block">
      {label}
      <input type="text" value={strVal} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} className={cls} />
    </label>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapModeToTab(modeId: string): string {
  const map: Record<string, string> = {
    chat: 'Chat',
    image: 'Image',
    video: 'Video',
    long_form_video: 'Video',
    image_to_video: 'Video',
    music: 'Music / Audio',
    tts: 'Voice / TTS',
    stt: 'STT / Transcription',
    avatar: 'Avatar / Talking Video',
    research_rag: 'Research',
    campaign: 'Research',
    automation: 'Automation',
    publishing: 'Publishing',
    trading: 'Trading',
    adult_private: 'Adult',
  }
  return map[modeId] ?? 'Chat'
}

function normalizeResult(data: Record<string, unknown>, modeId: string): StudioResult {
  const result = toRecord(data.result)
  const artifact = toRecord(data.artifact)
  const job = toRecord(data.job)
  const proof = toRecord(data.proof)
  const rawState = data.jobStatus ?? data.status ?? result?.status
  let execStatus = normalizeState(rawState)
  const mediaType = ['image', 'image_to_video'].includes(modeId) ? 'image'
    : ['music', 'tts'].includes(modeId) ? 'audio'
    : ['video', 'long_form_video', 'avatar'].includes(modeId) ? 'video'
    : undefined
  const artifactId = firstStr(data.artifactId, artifact?.id, result?.artifactId)
  const storageUrl = firstStr(data.storageUrl, data.mediaUrl, artifact?.storageUrl, result?.storageUrl)
  const rawOut = firstStr(data.output, data.imageUrl, data.videoUrl, data.musicUrl, data.audioUrl, data.mediaUrl, data.storageUrl, result?.output, result?.imageUrl, result?.videoUrl, result?.musicUrl, result?.audioUrl, result?.storageUrl)
  const outputUrl = rawOut?.startsWith('/api/artifacts/file/') ? rawOut : undefined
  const jobId = firstStr(data.jobId, job?.jobId, result?.jobId)
  const pollUrl = firstStr(data.pollUrl, job?.pollUrl, result?.pollUrl)
  const jobUrl = pollUrl
  const blocker = firstStr(data.blocker, data.error, result?.blocker, result?.error)

  if (['image', 'music', 'video', 'long_form_video', 'image_to_video', 'avatar'].includes(modeId) && execStatus === 'completed' && (!artifactId || !outputUrl)) {
    execStatus = 'failed'
  }

  return {
    text: execStatus === 'processing' ? `Job submitted: ${jobUrl ?? 'polling'}` : execStatus === 'failed' ? (blocker ?? 'Execution failed.') : summarize(data),
    status: execStatus,
    mediaType,
    provider: firstStr(data.selectedProvider, data.provider, result?.selectedProvider, result?.provider),
    model: firstStr(data.selectedModel, data.model, result?.selectedModel, result?.model),
    artifactId,
    artifactUrl: storageUrl?.startsWith('/api/artifacts/file/') ? storageUrl : undefined,
    storageUrl,
    jobId,
    pollUrl,
    jobUrl,
    outputUrl,
    blocker: execStatus === 'failed' ? (blocker ?? 'Job completed but no artifact was returned.') : blocker,
    nextAction: firstStr(data.nextAction, result?.nextAction),
    proofStatus: firstStr((proof as Record<string, unknown>)?.proofStatus, data.proofStatus, result?.proofStatus),
    attempts: normalizeAttempts(data.attempts ?? result?.attempts),
  }
}

function summarize(data: Record<string, unknown>) {
  const r = toRecord(data.result)
  if (typeof data.output === 'string') return data.output
  if (typeof r?.output === 'string') return r.output
  if (typeof data.artifactId === 'string') return `Artifact saved: ${data.artifactId}`
  return 'Execution completed. Check Assets & Jobs for saved references.'
}

function normalizeState(v: unknown): ExecutionState {
  const s = String(v ?? '').toLowerCase().replaceAll('_', '-')
  if (['queued', 'pending', 'processing', 'running', 'in-progress'].includes(s)) return 'processing'
  if (['submitted', 'accepted'].includes(s)) return 'submitted'
  if (['completed', 'complete', 'succeeded', 'success', 'generated'].includes(s)) return 'completed'
  if (['failed', 'error', 'cancelled', 'canceled', 'timed-out', 'timeout'].includes(s)) return 'failed'
  return 'completed'
}

function labelState(s: ExecutionState) {
  if (s === 'idle') return 'Idle'
  if (s === 'validating') return 'Validating…'
  if (s === 'submitted') return 'Submitted'
  if (s === 'processing') return 'Processing…'
  if (s === 'failed') return 'Failed'
  return 'Completed'
}

function upsert(jobs: ActiveJob[], next: ActiveJob) {
  return [next, ...jobs.filter((j) => j.id !== next.id)].slice(0, 8)
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)) }
function toRecord(v: unknown): Record<string, unknown> | null { return typeof v === 'object' && v !== null ? v as Record<string, unknown> : null }
function firstStr(...vals: unknown[]) { return vals.find((v): v is string => typeof v === 'string' && v.length > 0) }
function normalizeAttempts(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined
  const r = v.map((a) => {
    if (typeof a === 'string') return a
    if (!a || typeof a !== 'object') return ''
    const item = a as Record<string, unknown>
    const p = firstStr(item.provider, item.providerId) ?? 'unknown'
    const m = firstStr(item.model, item.modelId) ?? 'model'
    const s = firstStr(item.status) ?? (item.ok === true ? 'ok' : 'failed')
    const e = firstStr(item.error)
    return e ? `${p}/${m}: ${s} (${e})` : `${p}/${m}: ${s}`
  }).filter(Boolean)
  return r.length ? r : undefined
}

function ProofCard({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={['rounded-xl border border-slate-800 bg-slate-950/55 px-3 py-2', wide ? 'sm:col-span-2 lg:col-span-3' : ''].join(' ')}>
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-words text-xs font-bold text-slate-300">{value}</p>
    </div>
  )
}

function ProofLink({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/55 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p>
      <a href={value} target="_blank" rel="noreferrer" className="mt-1 block break-words text-xs font-bold text-cyan-200 hover:text-cyan-100">{value}</a>
    </div>
  )
}
