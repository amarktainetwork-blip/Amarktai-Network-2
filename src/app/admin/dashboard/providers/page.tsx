'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Loader2, RefreshCw, TestTube2, XCircle } from 'lucide-react'
import { getProviderStatus, testProvider, type ProviderStatusEntry } from '@/lib/dashboard-api'
import { ErrorState, LoadingState, PageHeader, SectionCard, StatusBadge } from '@/components/dashboard/ui'

// Only the 5 allowed providers are ever displayed
const ALLOWED_PROVIDER_KEYS = ['genx', 'huggingface', 'together', 'groq', 'mimo'] as const
type AllowedKey = typeof ALLOWED_PROVIDER_KEYS[number]

const DISPLAY_NAMES: Record<AllowedKey, string> = {
  genx: 'GenX',
  huggingface: 'Hugging Face',
  together: 'Together AI',
  groq: 'Groq',
  mimo: 'MiMo',
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<ProviderStatusEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    const result = await getProviderStatus()
    if (result.ok && result.data) {
      // Only show allowed providers — never expose removed providers
      setProviders(result.data.filter(p => (ALLOWED_PROVIDER_KEYS as readonly string[]).includes(p.key)))
    } else {
      setError(result.error ?? 'Failed to load provider status')
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const configuredCount = providers.filter(p => p.configured).length

  return (
    <div className="space-y-5">
      <PageHeader
        label="Providers"
        title="Provider Settings"
        description="Admin configuration for the 5 active AI providers. The runtime selects providers automatically — these settings control which are available."
        badge={
          <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-300">{configuredCount} / {ALLOWED_PROVIDER_KEYS.length} configured</span>
          </div>
        }
      />

      {loading && <LoadingState label="Checking provider status…" />}
      {!loading && error && <ErrorState message={error} retry={load} />}

      {!loading && !error && (
        <SectionCard
          title="Active Providers"
          action={
            <button onClick={load} className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-200">
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          }
        >
          <div className="space-y-3">
            {ALLOWED_PROVIDER_KEYS.map((key) => {
              const entry = providers.find(p => p.key === key)
              return (
                <ProviderCard
                  key={key}
                  providerKey={key}
                  displayName={DISPLAY_NAMES[key]}
                  entry={entry ?? null}
                  onRefresh={load}
                />
              )
            })}
          </div>
        </SectionCard>
      )}
    </div>
  )
}

function ProviderCard({
  providerKey, displayName, entry, onRefresh,
}: {
  providerKey: string
  displayName: string
  entry: ProviderStatusEntry | null
  onRefresh: () => void
}) {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; latencyMs?: number; error?: string } | null>(null)

  async function runTest() {
    setTesting(true)
    setTestResult(null)
    const result = await testProvider(providerKey)
    if (result.ok && result.data) {
      setTestResult(result.data)
    } else {
      setTestResult({ ok: false, error: result.error ?? 'Test failed' })
    }
    setTesting(false)
    onRefresh()
  }

  const configured = entry?.configured ?? false
  const connected = entry?.connected ?? false

  return (
    <div className="rounded-xl border border-slate-700/40 bg-slate-950/45 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-black text-slate-200">{displayName}</p>
            <StatusBadge
              status={connected ? 'healthy' : configured ? 'warning' : 'unknown'}
              label={connected ? 'connected' : configured ? 'key set' : 'not configured'}
            />
          </div>
          {entry?.capabilities && entry.capabilities.length > 0 && (
            <p className="mt-1 text-xs text-slate-500">
              {entry.capabilities.slice(0, 4).join(' · ')}{entry.capabilities.length > 4 ? ' …' : ''}
            </p>
          )}
          {entry?.keySource && entry.keySource !== 'missing' && (
            <p className="mt-0.5 text-[10px] text-slate-600">Key source: {entry.keySource}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {testResult && (
            <span className={`text-xs font-bold ${testResult.ok ? 'text-emerald-300' : 'text-red-300'}`}>
              {testResult.ok ? `OK${testResult.latencyMs ? ` (${testResult.latencyMs}ms)` : ''}` : (testResult.error ?? 'Failed')}
            </span>
          )}
          <button
            onClick={runTest}
            disabled={testing}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-400 hover:border-cyan-500/40 hover:text-cyan-300 disabled:opacity-50"
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TestTube2 className="h-3.5 w-3.5" />}
            Test
          </button>
        </div>
      </div>

      {entry?.lastError && (
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-400/20 bg-red-400/10 px-2.5 py-2">
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
          <p className="text-xs text-red-300">{entry.lastError}</p>
        </div>
      )}
    </div>
  )
}
