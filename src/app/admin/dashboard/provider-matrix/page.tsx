'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Loader2, Play, RefreshCw } from 'lucide-react'
import {
  DashboardEmptyState,
  DashboardMetricCard,
  DashboardPageHeader,
  DashboardSectionPanel,
  DashboardStatusBadge,
} from '@/components/dashboard/DashboardChrome'

type SelectorCatalog = {
  capabilities: string[]
  policies: string[]
  providers: Array<{
    id: string
    displayName: string
    capabilities: string[]
    artifactSupport: boolean
    asyncJobs: boolean
    streaming: boolean
  }>
}

type RouteCandidate = {
  provider: string
  model: {
    id: string
    status: string
    discoverySource?: string
    capabilityEvidence: string
    artifactSupport: boolean
    cost: number | null
    quality: number | null
    speed: number | null
    metadata?: { executable?: string | boolean; routeType?: string | null; safetyPolicy?: string | null }
  }
  score: number
  health: { state: string; configured: boolean; detail: string }
}

type RejectedCandidate = {
  provider: string
  modelId: string | null
  code: string
  reason: string
}

type SelectorResponse = {
  success: boolean
  request: {
    capability: string
    policy: string
    providerPin: string | null
    modelPin: string | null
    adult: boolean
    fallbackAllowed: boolean
  }
  plan: {
    capability: string
    profile: string
    selected: RouteCandidate | null
    candidates: RouteCandidate[]
    fallbackChain?: RouteCandidate[]
    rejectedCandidates?: RejectedCandidate[]
    reason: string
  }
  smoke: null | {
    executed: boolean
    status: string
    provider?: string
    model?: string
    latencyMs?: number
    output?: string | null
    error?: string | null
  }
  error?: string
}

export default function ProviderMatrixPage() {
  const [catalog, setCatalog] = useState<SelectorCatalog | null>(null)
  const [capability, setCapability] = useState('chat')
  const [policy, setPolicy] = useState('balanced')
  const [providerPin, setProviderPin] = useState('')
  const [modelPin, setModelPin] = useState('')
  const [adult, setAdult] = useState(false)
  const [fallbackAllowed, setFallbackAllowed] = useState(true)
  const [result, setResult] = useState<SelectorResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState<'dry_run' | 'smoke' | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/brain/selector', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data: SelectorCatalog) => {
        setCatalog(data)
        if (data.capabilities?.[0]) setCapability(data.capabilities.includes('chat') ? 'chat' : data.capabilities[0])
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Brain selector catalog unavailable.'))
      .finally(() => setLoading(false))
  }, [])

  const providerOptions = useMemo(() => {
    const providers = catalog?.providers ?? []
    return providers.filter((provider) => provider.capabilities.includes(capability))
  }, [catalog, capability])

  const executableModels = useMemo(() => {
    const seen = new Set<string>()
    return (result?.plan.candidates ?? [])
      .filter((candidate) => !providerPin || candidate.provider === providerPin)
      .map((candidate) => candidate.model.id)
      .filter((id) => {
        if (seen.has(id)) return false
        seen.add(id)
        return true
      })
  }, [providerPin, result])

  async function run(action: 'dry_run' | 'smoke') {
    setRunning(action)
    setError('')
    try {
      const response = await fetch('/api/admin/brain/selector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capability,
          policy,
          providerPin: providerPin || null,
          modelPin: modelPin || null,
          adult,
          fallbackAllowed,
          action,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Brain selector request failed.')
      setResult(data)
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Brain selector request failed.')
    } finally {
      setRunning(null)
    }
  }

  if (loading) {
    return <DashboardEmptyState title="Loading Brain selector" detail="Reading canonical provider truth, capabilities, and routing policies." />
  }

  return (
    <main className="space-y-6">
      <DashboardPageHeader
        eyebrow="Brain selector"
        title="Provider/model matrix"
        description="Capability-first route planning from canonical provider truth. Apps choose capability and policy; Brain selects provider/model."
      />

      {error ? <DashboardEmptyState title="Selector unavailable" detail={error} /> : null}

      <DashboardSectionPanel title="Route test" eyebrow="Dry-run or smoke">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Capability">
            <select value={capability} onChange={(event) => { setCapability(event.target.value); setModelPin('') }} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white">
              {(catalog?.capabilities ?? []).map((entry) => <option key={entry} value={entry}>{entry}</option>)}
            </select>
          </Field>
          <Field label="Policy">
            <select value={policy} onChange={(event) => setPolicy(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white">
              {(catalog?.policies ?? []).map((entry) => <option key={entry} value={entry}>{entry}</option>)}
            </select>
          </Field>
          <Field label="Pinned provider">
            <select value={providerPin} onChange={(event) => { setProviderPin(event.target.value); setModelPin('') }} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white">
              <option value="">None</option>
              {providerOptions.map((provider) => <option key={provider.id} value={provider.id}>{provider.displayName}</option>)}
            </select>
          </Field>
          <Field label="Executable model">
            <select value={modelPin} onChange={(event) => setModelPin(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white">
              <option value="">Auto</option>
              {executableModels.map((model) => <option key={model} value={model}>{model}</option>)}
            </select>
          </Field>
          <label className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-200">
            <input type="checkbox" checked={fallbackAllowed} onChange={(event) => setFallbackAllowed(event.target.checked)} />
            Fallback allowed
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-200">
            <input type="checkbox" checked={adult} onChange={(event) => setAdult(event.target.checked)} />
            Adult gate enabled
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={() => void run('dry_run')} disabled={running !== null} className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-cyan-100 disabled:opacity-50">
            {running === 'dry_run' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Dry-run route plan
          </button>
          <button type="button" onClick={() => void run('smoke')} disabled={running !== null} className="inline-flex items-center gap-2 rounded-full bg-cyan-300 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-950 disabled:opacity-50">
            {running === 'smoke' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Live smoke
          </button>
        </div>
      </DashboardSectionPanel>

      {result ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <DashboardMetricCard label="Selected provider" value={result.plan.selected?.provider ?? 'none'} tone={result.plan.selected ? 'emerald' : 'amber'} detail={result.plan.reason} />
            <DashboardMetricCard label="Selected model" value={result.plan.selected?.model.id ?? 'none'} tone="slate" detail={`Policy: ${result.request.policy}`} />
            <DashboardMetricCard label="Fallback chain" value={result.plan.fallbackChain?.length ?? 0} tone="cyan" detail={result.request.fallbackAllowed ? 'Fallback enabled' : 'Fallback disabled'} />
            <DashboardMetricCard label="Rejected" value={result.plan.rejectedCandidates?.length ?? 0} tone="amber" detail="Rejected candidates include exact route blocker codes." />
          </div>

          <DashboardSectionPanel title="Selected route" eyebrow="Brain decision">
            {result.plan.selected ? <CandidateCard candidate={result.plan.selected} /> : <p className="text-sm text-amber-200">{result.plan.reason}</p>}
            {result.smoke ? (
              <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
                <div className="mb-2 flex items-center gap-2">
                  <DashboardStatusBadge value={result.smoke.status} map={{
                    passed: { label: 'smoke passed', className: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-200' },
                    failed: { label: 'smoke failed', className: 'border-rose-500/30 bg-rose-500/12 text-rose-200' },
                    specialist_route_required: { label: 'specialist route required', className: 'border-amber-500/30 bg-amber-500/12 text-amber-200' },
                    no_route: { label: 'no route', className: 'border-slate-700/60 bg-slate-800/60 text-slate-300' },
                  }} />
                  {result.smoke.latencyMs ? <span>{result.smoke.latencyMs} ms</span> : null}
                </div>
                <p>{result.smoke.error || result.smoke.output || 'Smoke completed without text output.'}</p>
              </div>
            ) : null}
          </DashboardSectionPanel>

          <DashboardSectionPanel title="Fallback chain" eyebrow="Accepted executable candidates">
            <div className="space-y-3">
              {(result.plan.fallbackChain ?? []).map((candidate) => <CandidateCard key={`${candidate.provider}:${candidate.model.id}`} candidate={candidate} />)}
              {(result.plan.fallbackChain ?? []).length === 0 ? <p className="text-sm text-slate-400">No fallback candidates returned for this request.</p> : null}
            </div>
          </DashboardSectionPanel>

          <DashboardSectionPanel title="Rejected candidates" eyebrow="Sanitized blockers">
            <div className="grid gap-3 md:grid-cols-2">
              {(result.plan.rejectedCandidates ?? []).slice(0, 24).map((candidate, index) => (
                <div key={`${candidate.provider}:${candidate.modelId ?? 'provider'}:${index}`} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                  <p className="text-sm font-semibold text-white">{candidate.provider} {candidate.modelId ? `/ ${candidate.modelId}` : ''}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-amber-300">{candidate.code}</p>
                  <p className="mt-2 text-sm text-slate-400">{candidate.reason}</p>
                </div>
              ))}
            </div>
          </DashboardSectionPanel>
        </>
      ) : null}
    </main>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-2 text-sm">
      <span className="block text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
      {children}
    </label>
  )
}

function CandidateCard({ candidate }: { candidate: RouteCandidate }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-white">{candidate.provider}</p>
          <p className="mt-1 text-sm text-slate-400">{candidate.model.id}</p>
        </div>
        <DashboardStatusBadge value={candidate.health.state} map={{
          healthy: { label: 'healthy', className: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-200' },
          unknown: { label: 'unknown', className: 'border-slate-700/60 bg-slate-800/60 text-slate-300' },
          degraded: { label: 'degraded', className: 'border-amber-500/30 bg-amber-500/12 text-amber-200' },
          unconfigured: { label: 'unconfigured', className: 'border-rose-500/25 bg-rose-500/12 text-rose-200' },
        }} />
      </div>
      <div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-4">
        <span>Score {candidate.score.toFixed(3)}</span>
        <span>Cost {candidate.model.cost ?? 'unknown'}</span>
        <span>Quality {candidate.model.quality ?? 'unknown'}</span>
        <span>Artifact {candidate.model.artifactSupport ? 'yes' : 'no'}</span>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {candidate.model.discoverySource ?? 'unknown source'} / {candidate.model.capabilityEvidence} / {String(candidate.model.metadata?.executable ?? 'candidate')}
      </p>
    </div>
  )
}
