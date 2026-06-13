'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
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

type SettingsTruth = {
  providers: SettingsTruthEntry[]
  connectedCount: number
}

type StorageSetup = {
  configured: boolean
  writable: boolean
  readable: boolean
  driver: string
}

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

  const load = useCallback(async () => {
    setRefreshing(true)
    setLoadError('')
    try {
      const [settingsResponse, readinessResponse, routingResponse] = await Promise.all([
        fetch('/api/admin/settings/status', { cache: 'no-store' }),
        fetch('/api/admin/system/ai-deployment-readiness', { cache: 'no-store' }),
        fetch('/api/admin/settings/routing-policy', { cache: 'no-store' }),
      ])
      const [settingsData, readinessData, routingData] = await Promise.all([
        settingsResponse.json().catch(() => null),
        readinessResponse.json().catch(() => null),
        routingResponse.json().catch(() => null),
      ])
      if (!settingsResponse.ok || !settingsData?.truth) {
        throw new Error('Provider status is unavailable.')
      }

      setTruth({
        providers: settingsData.truth.providers ?? [],
        connectedCount: settingsData.truth.connectedCount ?? 0,
      })
      setStorage(
        readinessResponse.ok
          ? readinessData?.artifacts?.storage ?? null
          : null,
      )
      if (routingResponse.ok && routingData?.routingPolicy) {
        setRoutingPolicy(routingData.routingPolicy)
      }
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
              label={storage.writable ? 'Storage ready' : 'Storage needs setup'}
              status={storage.writable ? 'ready' : 'missing'}
            />
          ) : (
            <StatusPill label="Storage status unavailable" status="unknown" />
          )}
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
          <div className={`rounded-2xl border p-5 ${storage.writable ? 'border-emerald-800/40 bg-emerald-900/10' : 'border-amber-800/30 bg-amber-900/10'}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${storage.writable ? 'border-emerald-700/40 bg-emerald-900/30' : 'border-amber-700/30 bg-amber-900/20'}`}>
                  {storage.writable
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    : <AlertTriangle className="h-4 w-4 text-amber-400" />}
                </div>
                <div>
                  <p className="font-black text-slate-100">Artifact Storage</p>
                  <p className="text-xs text-slate-500">
                    {storage.writable ? 'Writable and ready' : 'Storage is not writable'}
                  </p>
                </div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${storage.writable ? 'bg-emerald-900/60 text-emerald-300' : 'bg-amber-900/60 text-amber-300'}`}>
                {storage.writable ? 'Ready' : 'Needs setup'}
              </span>
            </div>
            {!storage.writable && (
              <p className="mt-4 rounded-xl border border-amber-800/30 bg-amber-900/15 p-3 text-xs font-bold text-amber-200">
                Configure a readable and writable artifact storage location during deployment.
              </p>
            )}
          </div>
        ) : (
          <UnavailableCard label="Storage status is currently unavailable." />
        )}
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-slate-400">
          <Shield className="h-4 w-4" />
          Security & Policy
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: 'Connected App Secrets', desc: 'Manage signing secrets for registered connected apps', href: '/admin/dashboard/connected-apps' },
            { label: 'Content Safety Policy', desc: 'Configure safe mode, adult mode, and content filters', href: '/admin/dashboard/settings' },
          ].map(({ label, desc, href }) => (
            <a
              key={label}
              href={href}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5 transition hover:border-slate-700 hover:bg-slate-900/70"
            >
              <div>
                <p className="font-bold text-slate-200">{label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
            </a>
          ))}
        </div>
      </section>

      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/30 p-5">
        <div className="flex items-center gap-3">
          <Settings2 className="h-5 w-5 text-slate-500" />
          <div>
            <p className="font-bold text-slate-300">Advanced configuration</p>
            <p className="text-xs text-slate-500">
              Infrastructure connections are managed during deployment. Secret values are never displayed here.
            </p>
          </div>
        </div>
      </div>
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
