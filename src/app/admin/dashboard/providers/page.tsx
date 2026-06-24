'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Play, ServerCog } from 'lucide-react'
import {
  DashboardEmptyState,
  DashboardMetricCard,
  DashboardPageHeader,
  DashboardSectionPanel,
  DashboardStatusBadge,
} from '@/components/dashboard/DashboardChrome'

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
      <DashboardPageHeader
        eyebrow="Legacy diagnostics"
        title="Provider diagnostics"
        description="Live readiness for the six approved provider adapters. This remains a diagnostic/operator surface only and is not part of the normal capability-first product workflow."
        actions={<button type="button" onClick={() => void testAllProviders()} disabled={testing !== null || providers.length === 0} className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-cyan-100 disabled:opacity-50">{testing === 'all' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}Test all providers</button>}
      />

      {!loading && (
        <div className="grid gap-4 sm:grid-cols-3">
          <DashboardMetricCard label="Providers" value={providers.length} tone="slate" detail="Diagnostic provider entries currently returned by the backend." />
          <DashboardMetricCard label="Connected" value={providers.filter((provider) => provider.connected).length} tone="emerald" detail="Providers with a passing live test result." />
          <DashboardMetricCard label="Needs setup or test" value={providers.filter((provider) => !provider.connected).length} tone="amber" detail="Providers that still need setup or a successful diagnostic run." />
        </div>
      )}

      {error && (
        <div className="flex gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <DashboardEmptyState title="Loading provider truth" detail="Reading provider diagnostics, live test state, routes, and model summaries." />
      ) : (
        <DashboardSectionPanel title="Diagnostic provider cards" eyebrow="Operator-only view">
        <section className="grid gap-4 lg:grid-cols-2">
          {providers.map((provider) => (
            <article key={provider.id} className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-5 shadow-[0_24px_55px_rgba(0,0,0,0.2)] transition hover:border-cyan-400/16">
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
                      <DashboardStatusBadge value={provider.connected ? 'ready' : provider.status} map={{ ready: { label: 'live test passed', className: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-200' }, failed: { label: 'test failed', className: 'border-rose-500/30 bg-rose-500/12 text-rose-200' }, degraded: { label: 'degraded', className: 'border-amber-500/30 bg-amber-500/12 text-amber-200' }, unconfigured: { label: 'needs setup', className: 'border-slate-700/60 bg-slate-800/60 text-slate-300' } }} />
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void testProvider(provider.id)}
                  disabled={testing !== null}
                  className="inline-flex items-center gap-2 rounded-full bg-cyan-300 px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-slate-950 disabled:opacity-50"
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
        </DashboardSectionPanel>
      )}
    </main>
  )
}
