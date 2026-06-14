'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Key,
  Loader2,
  RefreshCw,
  Save,
  Server,
  Settings2,
  Shield,
  TestTube2,
} from 'lucide-react'
import type { SettingsTruthEntry } from '@/lib/platform-settings-truth'
import { settingsRuntimeTools } from '@/lib/settings-runtime-tools'

type SettingsTruth = {
  providers: SettingsTruthEntry[]
  connectedCount: number
  vaultEncryptionConfigured: boolean
  vaultWarning: string
  storage: StorageSetup
}

type StorageSetup = {
  configured: boolean
  writable: boolean
  readable: boolean
  deletable?: boolean
  ready?: boolean
  root?: string
  checkedAt?: string
  error?: string | null
  driver: string
}
type RuntimeTool = { id: string; connected: boolean; capabilities: string[]; detail: string }
type CapabilityEntry = { id?: string; capability?: string; label?: string; status?: string; readiness?: string; createsArtifact?: boolean; longRunning?: boolean; blocker?: string | null; providers?: unknown[] }

type RoutingPolicy = {
  studio: 'cheap' | 'balanced' | 'premium' | 'auto'
  connectedApps: 'cheap' | 'balanced' | 'premium' | 'auto'
}

const PROVIDER_DOCS: Record<string, { url: string; hint: string }> = {
  genx: { url: 'https://query.genx.sh', hint: 'Text, image, video, audio, music, avatar, TTS, and STT' },
  huggingface: { url: 'https://huggingface.co/settings/tokens', hint: 'Text, image, audio, STT, embeddings, and specialist models' },
  qwen: { url: 'https://dashscope.aliyuncs.com', hint: 'Text, image, video, audio, embeddings, and async jobs' },
  mimo: { url: 'https://api.xiaomimimo.com', hint: 'Text, reasoning, vision, audio, TTS, STT, and web search' },
  groq: { url: 'https://console.groq.com/keys', hint: 'Fast text, reasoning, STT, and TTS' },
  together: { url: 'https://api.together.xyz/settings/api-keys', hint: 'Text, image, embeddings, reranking, and open models' },
}

export default function SettingsPage() {
  const [truth, setTruth] = useState<SettingsTruth | null>(null)
  const [storage, setStorage] = useState<StorageSetup | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [routingPolicy, setRoutingPolicy] = useState<RoutingPolicy>({
    studio: 'auto',
    connectedApps: 'auto',
  })
  const [routingMessage, setRoutingMessage] = useState('')
  const [safety, setSafety] = useState({ safeMode: true, suggestiveMode: false, adultMode: false })
  const [adultCapabilities, setAdultCapabilities] = useState<Record<string, boolean>>({
    adult_text: false,
    adult_image: false,
    adult_voice: false,
    adult_avatar: false,
    adult_short_video: false,
    adult_long_video: false,
  })
  const [safetyMessage, setSafetyMessage] = useState('')
  const [runtimeTools, setRuntimeTools] = useState<RuntimeTool[]>([])
  const [capabilities, setCapabilities] = useState<CapabilityEntry[]>([])

  const load = useCallback(async () => {
    setRefreshing(true)
    setLoadError('')
    try {
      const [settingsResponse, routingResponse, safetyResponse, runtimeResponse, capabilityResponse] = await Promise.all([
        fetch('/api/admin/settings/status', { cache: 'no-store' }),
        fetch('/api/admin/settings/routing-policy', { cache: 'no-store' }),
        fetch('/api/admin/app-safety?appSlug=amarktai-network', { cache: 'no-store' }),
        fetch('/api/admin/settings/runtime-tools', { cache: 'no-store' }),
        fetch('/api/admin/system/ai-capabilities-truth', { cache: 'no-store' }),
      ])
      const [settingsData, routingData, safetyData, runtimeData, capabilityData] = await Promise.all([
        settingsResponse.json().catch(() => null),
        routingResponse.json().catch(() => null),
        safetyResponse.json().catch(() => null),
        runtimeResponse.json().catch(() => null),
        capabilityResponse.json().catch(() => null),
      ])
      if (!settingsResponse.ok || !settingsData?.truth) {
        throw new Error('Provider status is unavailable.')
      }

      setTruth({
        providers: settingsData.truth.providers ?? [],
        connectedCount: settingsData.truth.connectedCount ?? 0,
        vaultEncryptionConfigured: settingsData.truth.vaultEncryptionConfigured === true,
        vaultWarning: settingsData.truth.vaultWarning ?? '',
        storage: settingsData.truth.storage,
      })
      setStorage(settingsData.truth.storage ?? null)
      if (routingResponse.ok && routingData?.routingPolicy) {
        setRoutingPolicy(routingData.routingPolicy)
      }
      if (safetyResponse.ok) setSafety({
        safeMode: safetyData.safeMode !== false,
        suggestiveMode: Boolean(safetyData.suggestiveMode),
        adultMode: Boolean(safetyData.adultMode),
      })
      if (safetyResponse.ok && safetyData.adultCapabilities?.capabilities) {
        setAdultCapabilities(safetyData.adultCapabilities.capabilities)
      }
      if (runtimeResponse.ok) setRuntimeTools(settingsRuntimeTools(runtimeData.tools ?? []))
      if (capabilityResponse.ok) setCapabilities(capabilityData.capabilities ?? capabilityData.matrix ?? [])
    } catch {
      setTruth(null)
      setStorage(null)
      setLoadError('Provider readiness could not be checked. Refresh or sign in again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const providers = truth?.providers ?? []
  const connectedProviders = providers.filter((provider) => provider.connected).length

  async function saveRoutingPolicy() {
    setRoutingMessage('')
    const response = await fetch('/api/admin/settings/routing-policy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(routingPolicy),
    })
    const data = await response.json().catch(() => ({}))
    setRoutingMessage(response.ok ? 'Routing defaults saved.' : data.error ?? 'Routing defaults could not be saved.')
  }

  async function saveSafety() {
    setSafetyMessage('')
    const response = await fetch('/api/admin/app-safety', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appSlug: 'amarktai-network',
        ...safety,
        adultCapabilities,
      }),
    })
    const data = await response.json().catch(() => ({}))
    setSafetyMessage(response.ok ? 'Content safety policy saved.' : data.error || 'Policy could not be saved.')
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-400">Settings</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white lg:text-3xl">
            Connect capabilities once.
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Save a provider key securely, then run a live test before it is shown as ready.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-800/60 px-4 py-2 text-xs font-bold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {!loading && (
        <div className="flex flex-wrap gap-3">
          {truth ? (
            <StatusPill
              label={`${connectedProviders} of ${providers.length} providers ready`}
              status={
                providers.length > 0 && connectedProviders === providers.length
                  ? 'ready'
                  : connectedProviders > 0
                    ? 'partial'
                    : 'missing'
              }
            />
          ) : (
            <StatusPill label="Provider status unavailable" status="unknown" />
          )}
          {storage ? (
            <StatusPill
              label={storage.ready ? 'Storage ready' : 'Storage needs setup'}
              status={storage.ready ? 'ready' : 'missing'}
            />
          ) : (
            <StatusPill label="Storage status unavailable" status="unknown" />
          )}
          {truth && !truth.vaultEncryptionConfigured && (
            <StatusPill label="Vault encryption needs setup" status="missing" />
          )}
        </div>
      )}

      {truth?.vaultWarning && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-800/30 bg-amber-900/10 p-4 text-sm text-amber-100">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p>{truth.vaultWarning}</p>
        </div>
      )}

      {loadError && (
        <div className="flex items-start gap-3 rounded-2xl border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p>{loadError}</p>
        </div>
      )}

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-slate-400">
          <Settings2 className="h-4 w-4" />
          Capability Routing
        </h2>
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5">
          <p className="text-sm text-slate-300">
            Choose the cost and quality policy. AmarktAI still selects providers and models by capability and readiness.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <RoutingSelect
              label="Studio default"
              value={routingPolicy.studio}
              onChange={(studio) => setRoutingPolicy((current) => ({ ...current, studio }))}
            />
            <RoutingSelect
              label="Connected app default"
              value={routingPolicy.connectedApps}
              onChange={(connectedApps) => setRoutingPolicy((current) => ({ ...current, connectedApps }))}
            />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => void saveRoutingPolicy()}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2.5 text-xs font-black text-slate-950 transition hover:bg-teal-400"
            >
              <Save className="h-4 w-4" />
              Save routing defaults
            </button>
            {routingMessage && <p className="text-xs font-semibold text-teal-200">{routingMessage}</p>}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-slate-400">
          <Key className="h-4 w-4" />
          AI Provider Connections
        </h2>

        {loading ? (
          <LoadingCard label="Checking provider configuration..." />
        ) : truth ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {providers.map((provider) => (
              <ProviderConnectionCard key={provider.key} entry={provider} refresh={load} />
            ))}
          </div>
        ) : (
          <UnavailableCard label="Provider setup is unavailable until readiness can be checked." />
        )}
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-slate-400">
          <Server className="h-4 w-4" />
          Artifact Storage
        </h2>

        {loading ? (
          <LoadingCard label="Checking storage..." />
        ) : storage ? (
          <div className={`rounded-2xl border p-5 ${storage.ready ? 'border-emerald-800/40 bg-emerald-900/10' : 'border-amber-800/30 bg-amber-900/10'}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${storage.ready ? 'border-emerald-700/40 bg-emerald-900/30' : 'border-amber-700/30 bg-amber-900/20'}`}>
                  {storage.ready
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    : <AlertTriangle className="h-4 w-4 text-amber-400" />}
                </div>
                <div>
                  <p className="font-black text-slate-100">Artifact Storage</p>
                  <p className="text-xs text-slate-500">
                    {storage.ready ? 'Storage ready' : 'Storage is not ready'}
                  </p>
                </div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${storage.ready ? 'bg-emerald-900/60 text-emerald-300' : 'bg-amber-900/60 text-amber-300'}`}>
                {storage.ready ? 'Ready' : 'Needs setup'}
              </span>
            </div>
            {!storage.ready && (
              <p className="mt-4 rounded-xl border border-amber-800/30 bg-amber-900/15 p-3 text-xs font-bold text-amber-200">
                Configure a readable and writable artifact storage location during deployment.
              </p>
            )}
            <div className="mt-4 grid gap-2 text-xs sm:grid-cols-4">
              <StorageFact label="Readable" value={storage.readable} />
              <StorageFact label="Writable" value={storage.writable} />
              <StorageFact label="Deletable" value={storage.deletable === true} />
              <StorageFact label="Driver" text={storage.driver} />
            </div>
            {storage.root && <p className="mt-3 break-all text-xs text-slate-500">{storage.root}</p>}
            {storage.checkedAt && <p className="mt-1 text-[11px] text-slate-600">Checked {new Date(storage.checkedAt).toLocaleString()}</p>}
          </div>
        ) : (
          <UnavailableCard label="Storage status is currently unavailable." />
        )}
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-slate-400">
          <Shield className="h-4 w-4" />
          Content Safety / Adult Mode
        </h2>
        <div id="content-safety" className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5">
          <p className="text-sm leading-6 text-slate-400">Safe mode is the default. Suggestive and adult modes require explicit opt-in; prohibited content remains blocked in every mode.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <SafetyToggle label="Safe mode" detail="General-audience generation" checked={safety.safeMode} onChange={(safeMode) => setSafety((current) => ({ ...current, safeMode, ...(safeMode ? { suggestiveMode: false, adultMode: false } : {}) }))} />
            <SafetyToggle label="Suggestive mode" detail="Requires safe mode off" checked={safety.suggestiveMode} disabled={safety.safeMode} onChange={(suggestiveMode) => setSafety((current) => ({ ...current, suggestiveMode }))} />
            <SafetyToggle label="Adult mode" detail="Lawful 18+ content only" checked={safety.adultMode} disabled={safety.safeMode} onChange={(adultMode) => setSafety((current) => ({ ...current, adultMode }))} />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(adultCapabilities).map(([capability, enabled]) => (
              <SafetyToggle
                key={capability}
                label={capability.replaceAll('_', ' ')}
                detail={safety.adultMode ? 'Per-app capability' : 'Enable adult mode first'}
                checked={enabled}
                disabled={!safety.adultMode}
                onChange={(value) => setAdultCapabilities((current) => ({ ...current, [capability]: value }))}
              />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button onClick={() => void saveSafety()} className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2.5 text-xs font-black text-slate-950"><Save className="h-4 w-4" />Save safety policy</button>
            <a href="/api/admin/system/adult-capability-matrix?appSlug=amarktai-network" target="_blank" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-black text-slate-300"><TestTube2 className="h-4 w-4" />Test adult routes</a>
            {safetyMessage && <p className="text-xs text-teal-200">{safetyMessage}</p>}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-slate-400"><Server className="h-4 w-4" />Local Runtime Tools</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {runtimeTools.map((tool) => <article key={tool.id} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4"><div className="flex items-center justify-between"><p className="font-black text-white">{tool.id}</p><span className={`h-2.5 w-2.5 rounded-full ${tool.connected ? 'bg-emerald-400' : 'bg-amber-400'}`} /></div><p className="mt-3 text-xs leading-5 text-slate-500">{tool.detail}</p></article>)}
        </div>
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-slate-400"><Settings2 className="h-4 w-4" />Capability Matrix</h2>
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
          {capabilities.length === 0 ? <p className="p-5 text-sm text-slate-500">Capability truth is currently unavailable.</p> : capabilities.map((entry) => <div key={entry.id ?? entry.capability} className="grid gap-2 border-b border-slate-800/70 p-4 text-xs last:border-0 md:grid-cols-[1fr_130px_100px_100px_2fr]"><p className="font-black text-slate-200">{entry.label ?? String(entry.id ?? entry.capability).replaceAll('_', ' ')}</p><p className="font-bold text-cyan-300">{entry.readiness ?? entry.status ?? 'unknown'}</p><p className="text-slate-500">{entry.createsArtifact ? 'Artifact' : 'Direct result'}</p><p className="text-slate-500">{entry.longRunning ? 'Long-running' : 'Immediate'}</p><p className="text-slate-500">{entry.blocker || 'No declared blocker'}</p></div>)}
        </div>
      </section>
    </div>
  )
}

function RoutingSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: RoutingPolicy['studio']
  onChange: (value: RoutingPolicy['studio']) => void
}) {
  return (
    <label>
      <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as RoutingPolicy['studio'])}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 outline-none"
      >
        <option value="auto">Auto / mixed</option>
        <option value="cheap">Cheap</option>
        <option value="balanced">Balanced</option>
        <option value="premium">Premium</option>
      </select>
    </label>
  )
}

function ProviderConnectionCard({
  entry,
  refresh,
}: {
  entry: SettingsTruthEntry
  refresh: () => Promise<void>
}) {
  const [value, setValue] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState<'save' | 'test' | null>(null)
  const [message, setMessage] = useState('')
  const docs = PROVIDER_DOCS[entry.key]

  async function save() {
    if (!value.trim()) return
    setBusy('save')
    setMessage('')
    try {
      const response = await fetch('/api/admin/settings/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: entry.key,
          type: 'provider',
          label: entry.label,
          value: value.trim(),
        }),
      })
      const data = await response.json().catch(() => ({}))
      setMessage(response.ok ? `Saved ${data.masked ?? 'securely'}. Run the live test.` : data.error ?? 'Save failed.')
      if (response.ok) {
        setValue('')
        await refresh()
      }
    } finally {
      setBusy(null)
    }
  }

  async function test() {
    setBusy('test')
    setMessage('')
    try {
      const response = await fetch(entry.testRoute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: entry.key }),
      })
      const data = await response.json().catch(() => ({}))
      setMessage(data.success ? data.detail || 'Live test passed.' : data.error || 'Live test failed.')
      await refresh()
    } finally {
      setBusy(null)
    }
  }

  const ready = entry.connected
  const failed = entry.status === 'Failed'

  return (
    <article className={`rounded-2xl border p-5 ${ready ? 'border-emerald-800/40 bg-emerald-900/10' : failed ? 'border-red-800/40 bg-red-900/10' : 'border-amber-800/30 bg-amber-900/10'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-slate-100">{entry.label}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {docs?.hint ?? `Unlocks ${entry.unlocks}.`}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${ready ? 'bg-emerald-900/60 text-emerald-300' : failed ? 'bg-red-900/60 text-red-300' : 'bg-amber-900/60 text-amber-300'}`}>
          {ready ? 'Ready' : failed ? 'Test failed' : entry.configured ? 'Needs test' : 'Needs setup'}
        </span>
      </div>

      {entry.requiresSecret && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Paste API key"
              aria-label={`${entry.label} API key`}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 pr-10 text-sm text-white outline-none placeholder:text-slate-600 focus:border-teal-400/50"
            />
            <button
              type="button"
              onClick={() => setShow((current) => !current)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500"
              aria-label={show ? 'Hide value' : 'Show value'}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy !== null || !value.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs font-black text-slate-200 transition hover:bg-slate-700 disabled:opacity-40"
          >
            {busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      )}

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-400">{entry.lastTestResult}</p>
          <p className="mt-1 text-[11px] text-slate-500">
            {entry.lastTestedAt ? new Date(entry.lastTestedAt).toLocaleString() : entry.blocker}
          </p>
          {entry.error && <p className="mt-1 text-xs font-semibold text-red-300">{entry.error}</p>}
          {message && <p className="mt-1 text-xs font-semibold text-teal-200">{message}</p>}
          {!entry.configured && docs && (
            <a
              href={docs.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-400 transition hover:text-amber-300"
            >
              Get provider key <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <button
          type="button"
          onClick={() => void test()}
          disabled={busy !== null || (!entry.configured && entry.requiresSecret)}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-teal-500 px-3 py-2 text-xs font-black text-slate-950 transition hover:bg-teal-400 disabled:opacity-40"
        >
          {busy === 'test' ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />}
          Test
        </button>
      </div>
    </article>
  )
}

function StatusPill({
  label,
  status,
}: {
  label: string
  status: 'ready' | 'partial' | 'missing' | 'unknown'
}) {
  const styles = {
    ready: 'border-emerald-800/40 bg-emerald-900/20 text-emerald-300',
    partial: 'border-amber-800/30 bg-amber-900/15 text-amber-300',
    missing: 'border-amber-800/30 bg-amber-900/15 text-amber-300',
    unknown: 'border-slate-700 bg-slate-900/60 text-slate-300',
  }
  const dots = {
    ready: 'bg-emerald-400',
    partial: 'bg-amber-400',
    missing: 'bg-amber-400',
    unknown: 'bg-slate-500',
  }

  return (
    <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${styles[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dots[status]}`} />
      {label}
    </div>
  )
}

function LoadingCard({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
      <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  )
}

function UnavailableCard({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  )
}

function StorageFact({ label, value, text }: { label: string; value?: boolean; text?: string }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"><p className="text-slate-600">{label}</p><p className={`mt-1 font-black ${text ? 'text-slate-300' : value ? 'text-emerald-300' : 'text-amber-300'}`}>{text ?? (value ? 'Yes' : 'No')}</p></div>
}

function SafetyToggle({
  label,
  detail,
  checked,
  disabled,
  onChange,
}: {
  label: string
  detail: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return <label className={`flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 p-4 ${disabled ? 'opacity-50' : ''}`}><span><span className="block text-sm font-black text-slate-200">{label}</span><span className="mt-1 block text-xs text-slate-500">{detail}</span></span><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-teal-400" /></label>
}
