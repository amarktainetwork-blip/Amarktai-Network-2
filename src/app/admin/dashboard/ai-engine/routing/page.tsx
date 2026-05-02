'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, BrainCircuit, CheckCircle, GitBranch, Loader2, RefreshCcw, ShieldAlert, Sparkles, Zap } from 'lucide-react'

type Capability = 'chat' | 'coding' | 'reasoning' | 'creative' | 'image_generation' | 'voice_tts' | 'research' | 'adult_text' | 'adult_image'
type CostPreference = 'free_first' | 'cheap' | 'balanced' | 'premium'
type SafetyProfile = 'standard' | 'child_safe' | 'religious_safe' | 'adult_safe' | 'education_safe' | 'medical_caution' | 'travel_safe'

interface RouteCandidate {
  provider: string
  model: string
  displayName: string
  costTier: string
  reason: string
  enabled: boolean
  configured: boolean
  blocked: boolean
  blocker: string | null
}

interface RoutePlan {
  capability: Capability
  costPreference: CostPreference
  selected: RouteCandidate | null
  candidates: RouteCandidate[]
  blockers: string[]
  safetyProfile: SafetyProfile
  streamingSupported: boolean
  generatedAt: string
}

interface VoiceOption {
  id: string
  label: string
  provider: string
  model: string
  verified: boolean
  blocker: string | null
}

const CAPABILITIES: Array<{ value: Capability; label: string; note: string }> = [
  { value: 'chat', label: 'Chat', note: 'Default conversation and app assistants' },
  { value: 'coding', label: 'Coding', note: 'Repo Workbench and code agents' },
  { value: 'reasoning', label: 'Reasoning', note: 'Planning, audits, decisions' },
  { value: 'creative', label: 'Creative', note: 'Marketing, content and copy' },
  { value: 'image_generation', label: 'Images', note: 'Media Studio and app imagery' },
  { value: 'voice_tts', label: 'Voice TTS', note: 'Aiva and voice outputs' },
  { value: 'research', label: 'Research', note: 'Crawling, summarising, strategy' },
  { value: 'adult_text', label: 'Adult Text', note: 'Only for adult-safe apps with gate passed' },
  { value: 'adult_image', label: 'Adult Images', note: 'Only for specialist providers and adult-safe apps' },
]

const COSTS: Array<{ value: CostPreference; label: string; note: string }> = [
  { value: 'free_first', label: 'Free first', note: 'Use free/open/cheap models before GenX/premium' },
  { value: 'cheap', label: 'Cheap', note: 'Qwen, Groq, Together, HuggingFace first' },
  { value: 'balanced', label: 'Balanced', note: 'GenX first, then low-cost fallbacks' },
  { value: 'premium', label: 'Premium', note: 'Best quality first; higher spend' },
]

const SAFETY: Array<{ value: SafetyProfile; label: string }> = [
  { value: 'standard', label: 'Standard' },
  { value: 'education_safe', label: 'Learning/Courses' },
  { value: 'medical_caution', label: 'Equine/Medical caution' },
  { value: 'religious_safe', label: 'Religious safe' },
  { value: 'travel_safe', label: 'Travel safe' },
  { value: 'adult_safe', label: 'Adult safe' },
  { value: 'child_safe', label: 'Child safe' },
]

export default function AIRoutingPage() {
  const [capability, setCapability] = useState<Capability>('chat')
  const [costPreference, setCostPreference] = useState<CostPreference>('cheap')
  const [safetyProfile, setSafetyProfile] = useState<SafetyProfile>('standard')
  const [allowAdult, setAllowAdult] = useState(false)
  const [plan, setPlan] = useState<RoutePlan | null>(null)
  const [voices, setVoices] = useState<VoiceOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedCapability = useMemo(() => CAPABILITIES.find((item) => item.value === capability), [capability])

  async function loadPlan() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/ai-routing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capability,
          costPreference,
          allowAdult,
          requireStreaming: ['chat', 'coding', 'reasoning', 'creative', 'research', 'adult_text'].includes(capability),
          appProfile: {
            appSlug: 'amarktai-network',
            appType: 'ai-operating-system',
            safetyProfile,
            defaultCostPreference: costPreference,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok || data.success === false) throw new Error(data.error || data.blocker || 'Routing plan failed')
      setPlan(data.plan)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Routing plan failed')
    } finally {
      setLoading(false)
    }
  }

  async function loadVoices() {
    const res = await fetch('/api/admin/voice/options')
    const data = await res.json().catch(() => ({}))
    if (res.ok && data.success !== false) setVoices(data.voices ?? [])
  }

  useEffect(() => { loadPlan(); loadVoices() }, [])

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#081426] via-[#07111f] to-[#030712] p-6">
        <Link href="/admin/dashboard/ai-engine" className="mb-4 inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to AI Engine
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <BrainCircuit className="h-6 w-6 text-cyan-300" />
              <h1 className="text-2xl font-bold text-white">AI Routing Visualizer</h1>
            </div>
            <p className="max-w-3xl text-sm text-slate-400">See which provider/model the system will choose for each app capability before we wire new apps. Cheap/free AI like Qwen, Groq, Together and HuggingFace are visible here instead of hidden behind GenX.</p>
          </div>
          <button onClick={loadPlan} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />} Refresh route
          </button>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-4">
        <Card title="Capability">
          <select className="input" value={capability} onChange={(event) => setCapability(event.target.value as Capability)}>
            {CAPABILITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <p className="mt-2 text-xs text-slate-500">{selectedCapability?.note}</p>
        </Card>
        <Card title="Cost preference">
          <select className="input" value={costPreference} onChange={(event) => setCostPreference(event.target.value as CostPreference)}>
            {COSTS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <p className="mt-2 text-xs text-slate-500">{COSTS.find((item) => item.value === costPreference)?.note}</p>
        </Card>
        <Card title="Safety profile">
          <select className="input" value={safetyProfile} onChange={(event) => setSafetyProfile(event.target.value as SafetyProfile)}>
            {SAFETY.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <p className="mt-2 text-xs text-slate-500">App-specific safety profile for future app onboarding.</p>
        </Card>
        <Card title="Adult gate">
          <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300">
            Allow adult route
            <input type="checkbox" checked={allowAdult} onChange={(event) => setAllowAdult(event.target.checked)} />
          </label>
          <p className="mt-2 text-xs text-slate-500">Still requires adult-safe profile + runtime adult gate passed.</p>
        </Card>
      </section>

      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

      <section className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Selected route</p>
              <h2 className="text-xl font-bold text-white">{plan?.selected ? plan.selected.displayName : 'No route selected'}</h2>
            </div>
            {plan?.selected ? <CheckCircle className="h-6 w-6 text-emerald-300" /> : <ShieldAlert className="h-6 w-6 text-amber-300" />}
          </div>
          {plan?.selected ? (
            <div className="grid gap-3 sm:grid-cols-4">
              <Metric label="Provider" value={plan.selected.provider} />
              <Metric label="Model" value={plan.selected.model} />
              <Metric label="Cost" value={plan.selected.costTier} />
              <Metric label="Streaming" value={plan.streamingSupported ? 'supported' : 'not needed'} />
            </div>
          ) : (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
              {(plan?.blockers ?? ['No plan loaded yet.']).map((blocker) => <p key={blocker}>{blocker}</p>)}
            </div>
          )}
          {plan?.selected?.reason && <p className="mt-4 text-sm text-slate-400">{plan.selected.reason}</p>}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-300" />
            <h3 className="font-semibold text-white">Voice readiness</h3>
          </div>
          <div className="space-y-2">
            {voices.map((voice) => (
              <div key={voice.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">{voice.label}</p>
                  <span className={voice.verified ? 'text-xs text-emerald-300' : 'text-xs text-slate-500'}>{voice.verified ? 'Verified' : 'Locked'}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{voice.provider} · {voice.model}</p>
                {voice.blocker && <p className="mt-1 text-[11px] text-amber-300">{voice.blocker}</p>}
              </div>
            ))}
            {voices.length === 0 && <p className="text-sm text-slate-500">Voice options not loaded yet.</p>}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-4 flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-cyan-300" />
          <h3 className="font-semibold text-white">Candidate chain</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(plan?.candidates ?? []).map((candidate) => (
            <div key={`${candidate.provider}:${candidate.model}`} className={`rounded-xl border p-4 ${candidate.blocked ? 'border-white/10 bg-white/[0.02]' : 'border-emerald-400/20 bg-emerald-400/5'}`}>
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{candidate.displayName}</p>
                  <p className="text-xs text-slate-500">{candidate.provider} · {candidate.model}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-[10px] ${candidate.blocked ? 'bg-slate-500/10 text-slate-400' : 'bg-emerald-500/10 text-emerald-300'}`}>{candidate.blocked ? 'blocked' : 'ready'}</span>
              </div>
              <p className="text-xs text-slate-400">{candidate.reason}</p>
              {candidate.blocker && <p className="mt-2 text-[11px] text-amber-300">{candidate.blocker}</p>}
            </div>
          ))}
          {!plan && <p className="text-sm text-slate-500">Load a routing plan to see candidates.</p>}
        </div>
      </section>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-500">{title}</p>{children}</div>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{label}</p><p className="mt-1 truncate text-sm font-semibold text-white">{value}</p></div>
}
