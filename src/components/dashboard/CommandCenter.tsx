'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, ChevronDown, Clock3, Loader2, Send, Sparkles } from 'lucide-react'
import {
  AVATAR_STYLES,
  IMAGE_STYLES,
  MOVIE_STYLES,
  RESEARCH_DEPTHS,
  SONG_DURATIONS,
  SONG_GENRES,
  SONG_LANGUAGES,
  SONG_MOODS,
  SONG_STRUCTURES,
  SONG_VOCALS,
  VOICE_STYLES,
  type StudioCommandOptions,
} from '@/lib/studio-options'

type Capability = 'song' | 'avatar' | 'voice' | 'movie' | 'image' | 'research'

type CommandJob = {
  id: string
  prompt: string
  status: string
  route: {
    intent: string
    surface: string
    agentTeam: string[]
    providerStrategy: string[]
    approvalRequired: boolean
    approvalReason: string | null
    artifacts: string[]
    nextVisibleStep: string
    executionRoute: string
    options?: StudioCommandOptions
    selectedProviders?: string[]
  }
  timeline: Array<{ type: string; title: string; detail: string; timestamp: string }>
  execution?: { error?: string; detail?: string; imageUrl?: string; pollUrl?: string; jobId?: string }
}

const starters = [
  'Create song',
  'Create image',
  'Create video',
  'Create avatar',
  'Generate voice',
  'Build app',
  'Audit repo',
  'Fix repo',
  'Create PR',
  'Check system',
]

const capabilities: Array<{ value: Capability; label: string }> = [
  { value: 'song', label: 'Song' },
  { value: 'avatar', label: 'Avatar' },
  { value: 'voice', label: 'Voice' },
  { value: 'movie', label: 'Movie' },
  { value: 'image', label: 'Image' },
  { value: 'research', label: 'Research' },
]

export default function CommandCenter() {
  const [prompt, setPrompt] = useState('')
  const [jobs, setJobs] = useState<CommandJob[]>([])
  const [active, setActive] = useState<CommandJob | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [advanced, setAdvanced] = useState(false)
  const [controlsOpen, setControlsOpen] = useState(false)
  const [capability, setCapability] = useState<Capability>('song')
  const [options, setOptions] = useState<StudioCommandOptions>({
    costMode: 'balanced',
    duration: '180',
    genres: ['rock'],
    combineGenres: false,
    vocals: 'female',
    mood: 'uplifting',
    language: 'English',
    cleanLyrics: true,
    structure: 'auto',
    avatarStyle: AVATAR_STYLES[0],
    voiceStyle: VOICE_STYLES[0],
    movieStyle: MOVIE_STYLES[0],
    imageStyle: IMAGE_STYLES[0],
    researchDepth: RESEARCH_DEPTHS[1],
  })

  useEffect(() => {
    fetch('/api/admin/command').then((response) => response.json()).then((data) => setJobs(data.jobs ?? [])).catch(() => null)
  }, [])

  async function submit(text = prompt) {
    if (!text.trim()) return
    setLoading(true)
    setSubmitError('')
    try {
      const response = await fetch('/api/admin/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, options }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Command routing failed')
      setActive(data.job)
      setJobs((current) => [data.job, ...current])
      setPrompt('')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Command routing failed')
    } finally {
      setLoading(false)
    }
  }

  const attachedHref = useMemo(() => {
    if (!active) return ''
    if (active.route.surface === 'Workbench') return '/admin/dashboard/workbench'
    if (active.route.surface === 'System') return '/admin/dashboard/system'
    if (active.route.surface === 'Network Apps') return '/admin/dashboard/workspace'
    return active.route.executionRoute
  }, [active])

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="overflow-hidden rounded-3xl border border-cyan-400/20 bg-slate-900/70">
        <div className="border-b border-slate-700/50 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,.12),transparent_40%)] p-5 lg:p-7">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Workspace</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Say what you want done.</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Describe the outcome naturally. Amarktai selects the capability, coordinates the work, and keeps progress understandable.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {starters.map((starter) => <button key={starter} onClick={() => setPrompt(starter)} className="rounded-full border border-slate-700/60 bg-slate-950/50 px-3 py-2 text-left text-xs font-semibold text-slate-300 hover:border-cyan-400/30 hover:text-cyan-200">{starter}</button>)}
          </div>
        </div>

        <div className="min-h-[350px] space-y-4 p-5 lg:p-7">
          {!active && <div className="grid min-h-[290px] place-items-center text-center"><div><Sparkles className="mx-auto h-9 w-9 text-cyan-300/60" /><p className="mt-3 font-bold text-slate-300">Your plan, progress, and outputs appear here.</p></div></div>}
          {active && (
            <>
              <div className="ml-auto max-w-[85%] rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50">{active.prompt}</div>
              <div className="max-w-[92%] rounded-2xl border border-slate-700/50 bg-slate-950/60 p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-300">Ready to continue</p>
                <p className="mt-4 text-sm leading-6 text-slate-300">{active.route.nextVisibleStep}</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <Fact label="Working team" value={active.route.agentTeam.join(' + ')} />
                  <Fact label="Expected outputs" value={active.route.artifacts.join(', ')} />
                </div>
                {active.route.approvalRequired && <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/8 p-3 text-sm font-semibold text-amber-200">{active.route.approvalReason}</div>}
                {active.execution?.error && <div className="mt-3 rounded-xl border border-red-400/20 bg-red-400/8 p-3 text-sm font-semibold text-red-200">{active.execution.error}</div>}
                {active.execution?.detail && <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/8 p-3 text-sm font-semibold text-emerald-200">{active.execution.detail}</div>}
                {active.execution?.imageUrl && <a href={active.execution.imageUrl} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-300 px-4 py-2 text-xs font-black text-slate-950">Open image <ArrowRight className="h-4 w-4" /></a>}
                {attachedHref.startsWith('/admin') && <Link href={attachedHref} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2 text-xs font-black text-slate-950">Open attached workspace <ArrowRight className="h-4 w-4" /></Link>}
              </div>
              <div className="max-w-[92%] rounded-2xl border border-slate-700/50 bg-slate-950/40 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Progress</p>
                <div className="mt-3 space-y-3">
                  {active.timeline.map((item) => <div key={`${item.type}-${item.title}`} className="flex gap-3"><div className="mt-0.5">{item.type === 'waiting_for_approval' ? <Clock3 className="h-4 w-4 text-amber-300" /> : <CheckCircle2 className="h-4 w-4 text-cyan-300" />}</div><div><p className="text-sm font-bold text-slate-200">{friendlyTitle(item.title)}</p><p className="mt-0.5 text-xs leading-5 text-slate-400">{friendlyDetail(item.detail)}</p></div></div>)}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-slate-700/50 bg-slate-950/40 p-4">
          {submitError && (
            <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/8 px-3 py-2 text-sm font-semibold text-red-300">
              {submitError}
            </div>
          )}
          <div className="flex gap-2">
            <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit() } }} rows={3} placeholder="Create, build, audit, repair, research, monitor, or explain..." className="min-h-24 flex-1 resize-none rounded-2xl border border-slate-700/60 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50" />
            <button onClick={() => submit()} disabled={loading || !prompt.trim()} className="grid w-14 place-items-center rounded-2xl bg-cyan-300 text-slate-950 disabled:opacity-40" aria-label="Send command">{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}</button>
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4">
          <button onClick={() => setControlsOpen((value) => !value)} className="flex w-full items-center justify-between text-left">
            <span><span className="block font-black text-white">Creative options</span><span className="mt-1 block text-xs leading-5 text-slate-400">Open only when you want precise control.</span></span>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition ${controlsOpen ? 'rotate-180' : ''}`} />
          </button>
          {controlsOpen && (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-1.5">{capabilities.map((item) => <button key={item.value} onClick={() => setCapability(item.value)} className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold ${capability === item.value ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200' : 'border-slate-700 text-slate-400'}`}>{item.label}</button>)}</div>
              <CapabilityControls capability={capability} options={options} setOptions={setOptions} />
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4">
          <h2 className="font-black text-white">Active and recent jobs</h2>
          <div className="mt-3 space-y-2">
            {jobs.length === 0 && <p className="text-xs leading-5 text-slate-400">No commands yet.</p>}
            {jobs.slice(0, 5).map((job) => <button key={job.id} onClick={() => setActive(job)} className="block w-full rounded-xl border border-slate-700/40 bg-slate-950/40 p-3 text-left"><p className="truncate text-xs font-bold text-slate-300">{job.prompt}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{friendlyStatus(job.status)}</p></button>)}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2">
          <SummaryLink href="/admin/dashboard/outputs" label="Recent outputs" />
          <SummaryLink href="/admin/dashboard/network-apps" label="Connected apps" />
        </section>

        <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4">
          <button onClick={() => setAdvanced((value) => !value)} className="flex w-full items-center justify-between text-sm font-black text-slate-300">Advanced <ChevronDown className={`h-4 w-4 transition ${advanced ? 'rotate-180' : ''}`} /></button>
          {advanced && <div className="mt-4 space-y-2 text-xs leading-5 text-slate-400"><p>Provider overrides, deployment controls, merge controls, and model selection stay here.</p><p>Connected route: {active?.route.selectedProviders?.join(' → ') || 'Resolved after live connection checks.'}</p></div>}
        </section>
      </aside>
    </div>
  )
}

function CapabilityControls({ capability, options, setOptions }: { capability: Capability; options: StudioCommandOptions; setOptions: React.Dispatch<React.SetStateAction<StudioCommandOptions>> }) {
  const update = (patch: Partial<StudioCommandOptions>) => setOptions((current) => ({ ...current, ...patch }))
  if (capability === 'song') {
    return (
      <div className="space-y-3">
        <Field label="Duration"><select value={options.duration} onChange={(event) => update({ duration: event.target.value })} className="command-select">{SONG_DURATIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
        <Field label="Genres"><div className="rounded-xl border border-slate-700/60 bg-slate-950/50 p-2"><div className="flex flex-wrap gap-1.5">{SONG_GENRES.map((genre) => <button key={genre} onClick={() => update({ genres: options.genres?.includes(genre) ? options.genres.filter((item) => item !== genre) : [...(options.genres ?? []), genre] })} className={`rounded-full border px-2 py-1 text-[11px] font-bold ${options.genres?.includes(genre) ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200' : 'border-slate-700 text-slate-400'}`}>{genre}</button>)}</div></div></Field>
        <Toggle label="Combine selected genres" checked={Boolean(options.combineGenres)} onChange={(checked) => update({ combineGenres: checked })} />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Vocals"><Select values={SONG_VOCALS} value={options.vocals} onChange={(value) => update({ vocals: value })} /></Field>
          <Field label="Mood"><Select values={SONG_MOODS} value={options.mood} onChange={(value) => update({ mood: value })} /></Field>
          <Field label="Language"><Select values={SONG_LANGUAGES} value={options.language} onChange={(value) => update({ language: value })} /></Field>
          <Field label="Structure"><Select values={SONG_STRUCTURES} value={options.structure} onChange={(value) => update({ structure: value })} /></Field>
        </div>
        <Toggle label={options.cleanLyrics ? 'Clean lyrics' : 'Explicit lyrics allowed'} checked={Boolean(options.cleanLyrics)} onChange={(checked) => update({ cleanLyrics: checked })} />
      </div>
    )
  }

  const configuration = {
    avatar: { label: 'Avatar style', values: AVATAR_STYLES, value: options.avatarStyle, key: 'avatarStyle' },
    voice: { label: 'Voice style', values: VOICE_STYLES, value: options.voiceStyle, key: 'voiceStyle' },
    movie: { label: 'Movie style', values: MOVIE_STYLES, value: options.movieStyle, key: 'movieStyle' },
    image: { label: 'Image style', values: IMAGE_STYLES, value: options.imageStyle, key: 'imageStyle' },
    research: { label: 'Research depth', values: RESEARCH_DEPTHS, value: options.researchDepth, key: 'researchDepth' },
  }[capability]

  return <Field label={configuration.label}><Select values={configuration.values} value={configuration.value} onChange={(value) => update({ [configuration.key]: value })} /></Field>
}

function Select({ values, value, onChange }: { values: readonly string[]; value?: string; onChange: (value: string) => void }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} className="command-select">{values.map((item) => <option key={item} value={item}>{item}</option>)}</select>
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/50 bg-slate-950/40 px-3 py-2 text-xs font-semibold text-slate-300"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-cyan-300" /></label>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</span><span className="mt-1.5 block [&_.command-select]:w-full [&_.command-select]:rounded-xl [&_.command-select]:border [&_.command-select]:border-slate-700 [&_.command-select]:bg-slate-950 [&_.command-select]:px-3 [&_.command-select]:py-2.5 [&_.command-select]:text-sm [&_.command-select]:text-slate-300">{children}</span></label>
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-700/40 bg-slate-900/60 p-3"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p><p className="mt-1 text-xs font-semibold leading-5 text-slate-300">{value}</p></div>
}

function SummaryLink({ href, label }: { href: string; label: string }) {
  return <Link href={href} className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-3 text-xs font-black text-slate-300 hover:border-cyan-400/30 hover:text-cyan-200">{label}<ArrowRight className="mt-3 h-4 w-4" /></Link>
}

function friendlyStatus(status: string) {
  if (status === 'waiting_for_approval') return 'Approval needed'
  return status.replaceAll('_', ' ')
}

function friendlyTitle(title: string) {
  return title.replace('Studio plan ready', 'Creative plan ready').replace('Workbench plan ready', 'Repository plan ready')
}

function friendlyDetail(detail: string) {
  if (detail.startsWith('Routed as ')) return 'The right capability has been selected.'
  return detail
}
