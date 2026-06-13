'use client'

import Link from 'next/link'
import Image from 'next/image'
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
  Sparkles,
  XCircle,
} from 'lucide-react'

type AppOption = { id?: string; slug: string; name: string }
type SafetyPolicy = { safeMode: boolean; adultMode: boolean; suggestiveMode: boolean }
type Artifact = {
  id: string
  title: string
  type: string
  status: string
  previewUrl: string
  downloadUrl: string
  mimeType: string
}
type Execution = {
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
    events: Array<{ id: string; type: string; message: string; level: string; at: string }>
    error: string | null
    createdAt: string
  }
}

const capabilityOptions = [
  ['auto', 'Auto-detect'],
  ['chat', 'Chat'],
  ['code', 'Code'],
  ['file_analysis', 'File analysis'],
  ['research', 'Research'],
  ['image_generation', 'Image generation'],
  ['image_edit', 'Image edit'],
  ['video_generation', 'Video generation'],
  ['image_to_video', 'Image to video'],
  ['music_generation', 'Music generation'],
  ['lyrics_generation', 'Lyrics'],
  ['tts', 'Text to speech'],
  ['voice_response', 'Voice response'],
  ['scrape_website', 'Website research'],
] as const

const adultCapabilities = [
  ['adult_text', 'Adult text'],
  ['adult_image', 'Adult image'],
  ['adult_video', 'Adult video'],
  ['adult_voice', 'Adult voice'],
] as const

const quickActions = [
  ['chat', 'Chat', 'Ask AmarktAI to explain or draft something.'],
  ['research', 'Research', 'Research a topic and create a reusable result.'],
  ['image', 'Image', 'Generate an image through the image capability.'],
  ['image_edit', 'Image edit', 'Edit an image using a file or artifact reference.'],
  ['video', 'Video', 'Start video generation or return honest readiness.'],
  ['music', 'Music / song', 'Create music or return configuration status.'],
  ['tts', 'TTS / voice', 'Generate speech from your prompt.'],
  ['system_check', 'System check', 'Capture live runtime readiness as an artifact.'],
] as const

const activeStatuses = new Set(['planned', 'queued', 'running'])
export default function CommandCenter() {
  const [apps, setApps] = useState<AppOption[]>([])
  const [appSlug, setAppSlug] = useState('amarktai-network')
  const [policy, setPolicy] = useState<SafetyPolicy>({ safeMode: true, adultMode: false, suggestiveMode: false })
  const [capability, setCapability] = useState('auto')
  const [prompt, setPrompt] = useState('')
  const [references, setReferences] = useState('')
  const [active, setActive] = useState<Execution | null>(null)
  const [history, setHistory] = useState<Execution[]>([])
  const [reusedArtifacts, setReusedArtifacts] = useState<Artifact[]>([])
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const response = await fetch('/api/admin/playground?limit=30', { cache: 'no-store' })
      const data = await response.json()
      if (response.ok) setHistory(data.runs ?? [])
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch('/api/admin/apps', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => {
        const nextApps = Array.isArray(data) ? data : data.apps ?? []
        setApps(nextApps)
        if (nextApps.length && !nextApps.some((app: AppOption) => app.slug === appSlug)) {
          setAppSlug(nextApps[0].slug)
        }
      })
      .catch(() => null)
    loadHistory()
  }, [appSlug, loadHistory])

  useEffect(() => {
    fetch(`/api/admin/app-safety?appSlug=${encodeURIComponent(appSlug)}`, { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => {
        if (typeof data.safeMode === 'boolean') {
          setPolicy({
            safeMode: data.safeMode,
            adultMode: Boolean(data.adultMode),
            suggestiveMode: Boolean(data.suggestiveMode),
          })
        }
      })
      .catch(() => setPolicy({ safeMode: true, adultMode: false, suggestiveMode: false }))
  }, [appSlug])

  useEffect(() => {
    if (!active || !activeStatuses.has(active.status)) return
    const timer = window.setInterval(async () => {
      const response = await fetch(
        `/api/admin/playground?executionId=${encodeURIComponent(active.executionId)}`,
        { cache: 'no-store' },
      )
      if (!response.ok) return
      const run = await response.json()
      setActive(run)
      setHistory((items) => [run, ...items.filter((item) => item.executionId !== run.executionId)])
    }, 3000)
    return () => window.clearInterval(timer)
  }, [active])

  async function submit(quickAction?: string, executionId?: string) {
    const text = prompt.trim()
    if (!executionId && !text) return
    setLoading(true)
    setSubmitError('')
    try {
      const response = await fetch('/api/admin/playground', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(executionId ? { executionId } : {
          prompt: text,
          appSlug,
          capability: capability === 'auto' ? undefined : capability,
          quickAction,
          references: references.split('\n').map((value) => value.trim()).filter(Boolean),
          artifactIds: reusedArtifacts.map((artifact) => artifact.id),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Command Center execution failed')
      setActive(data)
      setHistory((items) => [data, ...items.filter((item) => item.executionId !== data.executionId)])
      if (!executionId) {
        setPrompt('')
        setReferences('')
        setReusedArtifacts([])
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Command Center execution failed')
    } finally {
      setLoading(false)
    }
  }

  async function decideApproval(decision: 'approve' | 'reject') {
    const approvalId = active?.approval.approvalId
    if (!approvalId) return
    setLoading(true)
    setSubmitError('')
    try {
      const response = await fetch(`/api/admin/approvals/${approvalId}/${decision}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(decision === 'approve' ? { note: 'Approved in Command Center' } : { reason: 'Rejected in Command Center' }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || `Could not ${decision} execution`)
      if (decision === 'approve') await submit(undefined, active.executionId)
      else {
        const refreshed = await fetch(`/api/admin/playground?executionId=${active.executionId}`).then((item) => item.json())
        setActive(refreshed)
        setHistory((items) => [refreshed, ...items.filter((item) => item.executionId !== refreshed.executionId)])
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Approval update failed')
    } finally {
      setLoading(false)
    }
  }

  async function reuseArtifact(artifact: Artifact) {
    setSubmitError('')
    const response = await fetch(`/api/admin/artifacts/${encodeURIComponent(artifact.id)}/reuse`, {
      method: 'POST',
    })
    const data = await response.json()
    if (!response.ok) {
      setSubmitError(data.error || 'Artifact cannot be reused')
      return
    }
    setReusedArtifacts((items) => [
      ...items.filter((item) => item.id !== artifact.id),
      artifact,
    ])
  }

  const visibleCapabilities = useMemo(
    () => policy.adultMode
      ? [...capabilityOptions, ...adultCapabilities]
      : capabilityOptions,
    [policy.adultMode],
  )
  const activeResult = resultText(active?.result)

  return (
    <div className="space-y-5">
      <header className="rounded-3xl border border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,.14),transparent_42%)] p-5 lg:p-7">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Command Center</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Say what you want done.</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
          Select the app context, inspect the execution plan, approve risky work, and reuse completed outputs without leaving the operating surface.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="App context">
            <select value={appSlug} onChange={(event) => setAppSlug(event.target.value)} className="command-control">
              {apps.length === 0 && <option value="amarktai-network">AmarktAI</option>}
              {apps.map((app) => <option key={app.slug} value={app.slug}>{app.name}</option>)}
            </select>
          </Field>
          <Field label="Capability">
            <select value={capability} onChange={(event) => setCapability(event.target.value)} className="command-control">
              {visibleCapabilities.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Fact label="App policy" value={policy.adultMode ? 'Adult mode opted in' : policy.suggestiveMode ? 'Suggestive mode opted in' : 'Safe mode'} />
          <Fact label="Execution path" value="Task -> Plan -> Approval -> Job -> Artifact" />
        </div>
      </header>

      <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4">
        <h2 className="font-black text-white">Quick actions</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map(([value, label, description]) => (
            <button
              key={value}
              onClick={() => submit(value)}
              disabled={loading || !prompt.trim()}
              className="rounded-xl border border-slate-700/50 bg-slate-950/45 p-3 text-left hover:border-cyan-400/30 disabled:opacity-40"
            >
              <span className="text-sm font-black text-slate-200">{label}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-400">{description}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <main className="space-y-5">
          <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4 lg:p-5">
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={5}
              placeholder="Create, research, explain, generate, plan, inspect, or check..."
              className="w-full resize-y rounded-2xl border border-slate-700/60 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50"
            />
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
              <input
                value={references}
                onChange={(event) => setReferences(event.target.value)}
                placeholder="File paths or reference URLs, one per line"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 outline-none placeholder:text-slate-500"
              />
              <button
                onClick={() => submit()}
                disabled={loading || !prompt.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-40"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Run
              </button>
            </div>
            {reusedArtifacts.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {reusedArtifacts.map((artifact) => (
                  <button key={artifact.id} onClick={() => setReusedArtifacts((items) => items.filter((item) => item.id !== artifact.id))} className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-200">
                    Context: {artifact.title} x
                  </button>
                ))}
              </div>
            )}
            {submitError && <ErrorPanel message={submitError} />}
          </section>

          {!active && (
            <section className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-slate-700/60 bg-slate-900/30 text-center">
              <div><Sparkles className="mx-auto h-9 w-9 text-cyan-300/60" /><p className="mt-3 font-bold text-slate-300">Plan, progress, results, and artifacts appear here.</p></div>
            </section>
          )}

          {active && (
            <>
              <section className="grid gap-3 md:grid-cols-2">
                <Panel title="Route plan">
                  <Fact label="Detected capability" value={friendly(active.capability)} />
                  <Fact label="Status" value={friendly(active.status)} />
                  {active.readiness && <Fact label="Readiness" value={friendly(active.readiness)} />}
                  <p className="text-xs leading-5 text-slate-400">{active.providerPlan.reason}</p>
                </Panel>
                <Panel title="Provider / model">
                  <Fact label="Connected route" value={active.providerPlan.provider ?? 'No executable provider selected'} />
                  <Fact label="Model" value={active.modelPlan.model ?? active.modelPlan.task ?? 'No executable model selected'} />
                  <p className="text-xs leading-5 text-slate-400">Fallbacks: {active.providerPlan.fallbackProviders.join(' -> ') || 'None'}</p>
                </Panel>
              </section>

              <Panel title="Approval status">
                {!active.approval.required && <StatusLine icon="ok" title="No approval required" detail="This action is allowed to run automatically." />}
                {active.approval.status === 'pending' && (
                  <>
                    <StatusLine icon="wait" title="Approval required" detail={active.approval.reason ?? 'Review before continuing.'} />
                    <div className="flex gap-2">
                      <button onClick={() => decideApproval('approve')} disabled={loading} className="rounded-xl bg-emerald-300 px-4 py-2 text-xs font-black text-slate-950">Approve and run</button>
                      <button onClick={() => decideApproval('reject')} disabled={loading} className="rounded-xl border border-red-400/30 px-4 py-2 text-xs font-black text-red-200">Reject</button>
                    </div>
                  </>
                )}
                {active.approval.status === 'approved' && <StatusLine icon="ok" title="Approved" detail="The approved execution may continue through the canonical runner." />}
                {active.approval.status === 'rejected' && <StatusLine icon="error" title="Rejected" detail="The execution was cancelled without running." />}
              </Panel>

              <Panel title="Job / execution progress">
                <div className="space-y-3">
                  {active.execution.events.map((event) => (
                    <StatusLine key={event.id} icon={event.level === 'error' ? 'error' : event.level === 'warning' ? 'wait' : 'ok'} title={friendly(event.type)} detail={event.message} />
                  ))}
                  {active.job?.pollUrl && <a href={active.job.pollUrl} className="inline-flex items-center gap-2 text-xs font-black text-cyan-300">Open provider job <ArrowRight className="h-3.5 w-3.5" /></a>}
                </div>
              </Panel>

              {(active.error || active.execution?.error) && <ErrorPanel message={active.error ?? active.execution?.error ?? 'Execution failed'} />}

              <Panel title="Result and artifacts">
                {activeResult && <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">{activeResult}</p>}
                {!activeResult && active.status === 'queued' && <StatusLine icon="wait" title="Provider job pending" detail="No completed artifact is shown until the provider returns one." />}
                {!activeResult && !active.artifacts.length && active.status !== 'queued' && <p className="text-sm text-slate-400">No result or completed artifact is available.</p>}
                <div className="grid gap-3 md:grid-cols-2">
                  {active.artifacts.map((artifact) => <ArtifactCard key={artifact.id} artifact={artifact} onReuse={reuseArtifact} />)}
                </div>
              </Panel>
            </>
          )}
        </main>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between">
              <div><h2 className="font-black text-white">Run history</h2><p className="mt-1 text-xs text-slate-400">Execution-store records only.</p></div>
              <button onClick={loadHistory} aria-label="Refresh history" className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:text-cyan-200">
                <RefreshCw className={`h-4 w-4 ${historyLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {history.length === 0 && <p className="text-xs leading-5 text-slate-400">No Command Center executions yet.</p>}
              {history.map((run) => (
                <button key={run.executionId} onClick={() => setActive(run)} className="block w-full rounded-xl border border-slate-700/40 bg-slate-950/40 p-3 text-left hover:border-cyan-400/25">
                  <p className="truncate text-xs font-bold text-slate-200">{run.execution.input.prompt}</p>
                  <div className="mt-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                    <span>{friendly(run.capability)}</span><span>{friendly(run.status)}</span>
                  </div>
                  {run.artifacts.length > 0 && <span className="mt-2 block text-[11px] font-bold text-cyan-300">{run.artifacts.length} reusable artifact{run.artifacts.length === 1 ? '' : 's'}</span>}
                </button>
              ))}
            </div>
          </section>
          <section className="grid grid-cols-2 gap-2">
            <SummaryLink href="/admin/dashboard/artifacts" label="Artifacts" />
            <SummaryLink href="/admin/dashboard/jobs" label="Jobs" />
          </section>
          <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4 text-xs leading-5 text-slate-400">
            <p className="font-black text-slate-200">Creative options</p>
            <p className="mt-2">Media controls remain capability-specific. Command Center submits task context and records honest readiness.</p>
          </section>
        </aside>
      </div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-3 rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4"><h2 className="font-black text-white">{title}</h2>{children}</section>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</span><span className="[&_.command-control]:w-full [&_.command-control]:rounded-xl [&_.command-control]:border [&_.command-control]:border-slate-700 [&_.command-control]:bg-slate-950 [&_.command-control]:px-3 [&_.command-control]:py-2.5 [&_.command-control]:text-sm [&_.command-control]:text-slate-200 [&_.command-control]:outline-none">{children}</span></label>
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-700/40 bg-slate-950/40 p-3"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p><p className="mt-1 text-xs font-semibold leading-5 text-slate-300">{value}</p></div>
}

function StatusLine({ icon, title, detail }: { icon: 'ok' | 'wait' | 'error'; title: string; detail: string }) {
  const Icon = icon === 'ok' ? CheckCircle2 : icon === 'wait' ? Clock3 : XCircle
  return <div className="flex gap-3"><Icon className={`mt-0.5 h-4 w-4 shrink-0 ${icon === 'ok' ? 'text-cyan-300' : icon === 'wait' ? 'text-amber-300' : 'text-red-300'}`} /><div><p className="text-sm font-bold text-slate-200">{title}</p><p className="mt-0.5 text-xs leading-5 text-slate-400">{detail}</p></div></div>
}

function ErrorPanel({ message }: { message: string }) {
  return <section className="mt-3 flex gap-3 rounded-xl border border-red-400/25 bg-red-400/8 p-3 text-sm text-red-200"><AlertTriangle className="h-4 w-4 shrink-0" /><span>{message}</span></section>
}

function ArtifactCard({ artifact, onReuse }: { artifact: Artifact; onReuse: (artifact: Artifact) => void }) {
  return (
    <article className="overflow-hidden rounded-xl border border-slate-700/50 bg-slate-950/45">
      {artifact.type === 'image' && artifact.previewUrl && <Image unoptimized width={640} height={352} src={artifact.previewUrl} alt={artifact.title} className="h-44 w-full object-cover" />}
      {['audio', 'music', 'voice'].includes(artifact.type) && artifact.previewUrl && <audio controls className="w-full p-3" src={artifact.previewUrl} />}
      {artifact.type === 'video' && artifact.previewUrl && <video controls className="h-44 w-full bg-black object-contain" src={artifact.previewUrl} />}
      <div className="p-3">
        <p className="truncate text-sm font-black text-slate-200">{artifact.title}</p>
        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{friendly(artifact.type)} / {friendly(artifact.status)}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={artifact.previewUrl || artifact.downloadUrl} className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-bold text-slate-300">Open <ArrowRight className="h-3 w-3" /></a>
          <button onClick={() => onReuse(artifact)} className="inline-flex items-center gap-1 rounded-lg bg-cyan-300 px-2.5 py-1.5 text-xs font-black text-slate-950"><RotateCcw className="h-3 w-3" />Reuse</button>
        </div>
      </div>
    </article>
  )
}

function SummaryLink({ href, label }: { href: string; label: string }) {
  return <Link href={href} className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-3 text-xs font-black text-slate-300 hover:border-cyan-400/30 hover:text-cyan-200">{label}<ArrowRight className="mt-3 h-4 w-4" /></Link>
}

function resultText(value: unknown) {
  if (!value || typeof value !== 'object') return typeof value === 'string' ? value : ''
  const result = value as Record<string, unknown>
  for (const key of ['output', 'detail', 'message', 'error', 'blocker']) {
    if (typeof result[key] === 'string') return result[key] as string
  }
  if (typeof result.readiness === 'string') return `Readiness: ${result.readiness}`
  return ''
}

function friendly(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}
