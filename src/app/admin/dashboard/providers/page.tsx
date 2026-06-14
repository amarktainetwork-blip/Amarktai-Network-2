'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Play, ServerCog } from 'lucide-react'

type ProviderDiagnostic = {
  id: string
  name: string
  configured: boolean
  connected: boolean
  status: string
  lastTestResult: string
  lastTestedAt: string | null
  error: string
  blocker: string
  capabilities: string[]
  executableRouteCount: number
  models: Array<{ id: string; name: string; capabilities: string[]; enabled: boolean }>
  routes: Array<{
    capability: string
    label: string
    executable: boolean
    adapter: string
    endpoint: string | null
    models: string[]
    blocker: string | null
  }>
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<ProviderDiagnostic[]>([])
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/system/provider-diagnostics', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Provider diagnostics are unavailable.')
      setProviders(data.providers ?? [])
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Provider diagnostics are unavailable.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function testProvider(id: string) {
    setTesting(id)
    setError('')
    try {
      const response = await fetch('/api/admin/settings/test-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: id }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Live provider test failed.')
      }
      await load()
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : 'Live provider test failed.')
      await load()
    } finally {
      setTesting(null)
    }
  }

  async function testAllProviders() {
    setTesting('all')
    setError('')
    const failures: string[] = []
    for (const provider of providers) {
      const response = await fetch('/api/admin/settings/test-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: provider.id }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.success) {
        failures.push(`${provider.name}: ${result.error || 'test failed'}`)
      }
    }
    await load()
    setTesting(null)
    if (failures.length) setError(failures.join(' '))
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-teal-400">Operations</p>
          <h1 className="mt-1 text-3xl font-semibold text-white">Providers</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Live readiness for the six approved provider adapters. Models and routes are diagnostics,
            not a provider picker for normal product work.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void testAllProviders()}
          disabled={testing !== null || providers.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-teal-400/40 bg-teal-400/10 px-4 py-2.5 text-sm font-medium text-teal-100 disabled:opacity-50"
        >
          {testing === 'all' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Test all providers
        </button>
      </header>

      {error && (
        <div className="flex gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-3 py-16 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading provider truth...
        </div>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {providers.map((provider) => (
            <article key={provider.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="rounded-xl bg-teal-500/10 p-2 text-teal-300">
                    <ServerCog className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-white">{provider.name}</h2>
                    <div className="mt-1 flex items-center gap-2 text-sm">
                      {provider.connected ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-amber-400" />
                      )}
                      <span className={provider.connected ? 'text-emerald-300' : 'text-amber-300'}>
                        {provider.connected ? 'Live test passed' : provider.status}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void testProvider(provider.id)}
                  disabled={testing !== null}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-3 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
                >
                  {testing === provider.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Test live
                </button>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-white/[0.03] p-3">
                  <dt className="text-slate-500">Executable routes</dt>
                  <dd className="mt-1 font-medium text-white">{provider.executableRouteCount}</dd>
                </div>
                <div className="rounded-lg bg-white/[0.03] p-3">
                  <dt className="text-slate-500">Registered models</dt>
                  <dd className="mt-1 font-medium text-white">{provider.models.length}</dd>
                </div>
              </dl>

              <p className="mt-4 text-xs text-slate-500">
                {provider.lastTestedAt
                  ? `Last tested ${new Date(provider.lastTestedAt).toLocaleString()}`
                  : provider.blocker || 'Not live-tested yet.'}
              </p>
              {(provider.error || (!provider.connected && provider.blocker)) && (
                <p className="mt-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-200">
                  {provider.error || provider.blocker}
                </p>
              )}

              <details className="mt-4 text-sm">
                <summary className="cursor-pointer text-slate-300">
                  View capabilities, routes, and models
                </summary>
                <div className="mt-3 space-y-3">
                  <p className="text-slate-400">{provider.capabilities.join(', ')}</p>
                  <div className="max-h-56 space-y-2 overflow-auto">
                    {provider.routes.map((route) => (
                      <div key={route.capability} className="rounded-lg border border-white/5 p-3">
                        <div className="flex justify-between gap-3">
                          <span className="text-white">{route.label}</span>
                          <span className={route.executable ? 'text-emerald-300' : 'text-amber-300'}>
                            {route.executable ? 'Executable' : 'Setup required'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {route.endpoint || route.blocker || 'No execution endpoint registered.'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            </article>
          ))}
        </section>
      )}
    </main>
  )
}
