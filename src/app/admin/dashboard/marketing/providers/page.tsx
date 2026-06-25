'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Loader2, RefreshCw, XCircle, Zap } from 'lucide-react'
import { PageHeader, StatusBadge, LoadingState, ErrorState } from '@/components/dashboard/ui'
import { getProviderStatus, testProvider, type ProviderStatusEntry } from '@/lib/dashboard-api'

// Only the 5 active providers — never show removed ones
const ACTIVE_PROVIDER_KEYS = ['genx', 'huggingface', 'together', 'groq', 'mimo'] as const
type ActiveProviderKey = typeof ACTIVE_PROVIDER_KEYS[number]

const PROVIDER_LABELS: Record<ActiveProviderKey, string> = {
  genx: 'GenX',
  huggingface: 'Hugging Face',
  together: 'Together AI',
  groq: 'Groq',
  mimo: 'MiMo',
}

const PROVIDER_DESC: Record<ActiveProviderKey, string> = {
  genx: 'Primary execution layer — chat, image, video, music, TTS, STT',
  huggingface: 'Embeddings, music generation (MusicGen), fallback text',
  together: 'Fallback text, adult image generation',
  groq: 'Fast fallback text inference',
  mimo: 'MiMo text generation fallback',
}

type TestState = { busy: boolean; latencyMs?: number; ok?: boolean; error?: string }

export default function MarketingProvidersPage() {
  const [entries, setEntries] = useState<ProviderStatusEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tests, setTests] = useState<Record<string, TestState>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await getProviderStatus()
    if (!res.ok || !res.data) {
      setError(res.error ?? 'Could not load provider status')
    } else {
      const filtered = res.data.filter((e) => (ACTIVE_PROVIDER_KEYS as readonly string[]).includes(e.key))
      setEntries(filtered)
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const runTest = useCallback(async (key: string) => {
    setTests((t) => ({ ...t, [key]: { busy: true } }))
    const res = await testProvider(key)
    setTests((t) => ({
      ...t,
      [key]: { busy: false, ok: res.ok && res.data?.ok, latencyMs: res.data?.latencyMs, error: res.data?.error ?? res.error ?? undefined },
    }))
  }, [])

  if (loading) return <LoadingState label="Loading provider status…" />
  if (error) return <ErrorState message={error} retry={load} />

  const display = ACTIVE_PROVIDER_KEYS.map((key) => {
    const entry = entries.find((e) => e.key === key)
    return entry ?? { key, displayName: PROVIDER_LABELS[key], configured: false, status: 'not_configured', reason: 'No key configured' } satisfies ProviderStatusEntry
  })

  return (
    <div className="space-y-6">
      <PageHeader
        label="Marketing / Providers"
        title="Provider Settings"
        description="Configure API keys for each active provider. The runtime chooses which provider to use — apps never select providers directly."
        badge={
          <button onClick={load} className="flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-800/60 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {display.map((entry) => {
          const key = entry.key as ActiveProviderKey
          const test = tests[key]
          return (
            <div key={key} className={`rounded-2xl border p-5 ${entry.configured ? 'border-emerald-400/20 bg-emerald-400/5' : 'border-slate-700/50 bg-slate-900/60'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-white">{PROVIDER_LABELS[key] ?? entry.displayName}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{PROVIDER_DESC[key] ?? ''}</p>
                </div>
                <StatusBadge status={entry.configured ? 'configured' : 'not_configured'} label={entry.configured ? 'Configured' : 'Not configured'} />
              </div>
              <p className="mt-3 text-xs text-slate-400">{entry.reason}</p>
              {test && !test.busy && (
                <div className={`mt-3 flex items-center gap-2 text-xs font-bold ${test.ok ? 'text-emerald-300' : 'text-red-300'}`}>
                  {test.ok
                    ? <><CheckCircle2 className="h-3.5 w-3.5" /> Test passed · {test.latencyMs}ms</>
                    : <><XCircle className="h-3.5 w-3.5" /> {test.error ?? 'Test failed'}</>
                  }
                </div>
              )}
              <div className="mt-4 flex items-center gap-2">
                <a href="/admin/dashboard/settings" className="rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-800">
                  Configure key
                </a>
                <button
                  onClick={() => runTest(key)}
                  disabled={test?.busy}
                  className="flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-300 hover:bg-sky-500/15 disabled:opacity-50"
                >
                  {test?.busy ? <><Loader2 className="h-3 w-3 animate-spin" /> Testing…</> : <><Zap className="h-3 w-3" /> Test</>}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
