'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AppWindow, ArrowLeft, CheckCircle, RefreshCw, Shield, WalletCards } from 'lucide-react'

interface AppAiPackage {
  appSlug: string
  appName: string
  appType: string
  safetyProfile: string
  enabledCapabilityIds: string[]
  selections: Array<{ capabilityId: string; provider: string; modelId: string; fallbackProvider?: string; notes?: string }>
  budget?: { mode: string; monthlyUsd?: number; maxPerRequestUsd?: number }
  permissions: Record<string, boolean>
  status: string
  blockers: string[]
}

const APP_TYPES = ['marketing', 'learning-courses', 'adult-companion', 'horse-equine-management', 'religious-content', 'travel-planning', 'ai-operating-system', 'general']

export default function AppAiSetupPage() {
  const [appSlug, setAppSlug] = useState('future-marketing-app')
  const [appName, setAppName] = useState('Future Marketing App')
  const [appType, setAppType] = useState('marketing')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [preferCheap, setPreferCheap] = useState(true)
  const [allowAdult, setAllowAdult] = useState(false)
  const [pkg, setPkg] = useState<AppAiPackage | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function generate() {
    setLoading(true)
    setError('')
    try {
      const body: Record<string, unknown> = { appSlug, appName, appType, preferCheap, allowAdult }
      if (websiteUrl.trim()) body.websiteUrl = websiteUrl.trim()
      const res = await fetch('/api/admin/app-ai-package/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok || data.success === false) throw new Error(data.error ?? `HTTP ${res.status}`)
      setPkg(data.package)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to recommend app AI package')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-[#0d1a2e] to-[#060d1b] p-6">
        <Link href="/admin/dashboard/apps" className="mb-4 inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Apps
        </Link>
        <div className="flex items-center gap-2">
          <AppWindow className="h-6 w-6 text-cyan-400" />
          <h1 className="text-2xl font-bold text-white">App AI Setup</h1>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Generate the first AI package for any connected app. Each app gets its own capabilities, provider/model choices, budget and permissions — no global default model.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-sm font-semibold text-white">App details</h2>
          <div className="mt-4 space-y-3">
            <label className="block text-xs text-slate-400">App slug<input value={appSlug} onChange={(e) => setAppSlug(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none" /></label>
            <label className="block text-xs text-slate-400">App name<input value={appName} onChange={(e) => setAppName(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none" /></label>
            <label className="block text-xs text-slate-400">App type<select value={appType} onChange={(e) => setAppType(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none">{APP_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
            <label className="block text-xs text-slate-400">Website URL for crawler intelligence<input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://example.com" className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none" /></label>
            <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={preferCheap} onChange={(e) => setPreferCheap(e.target.checked)} /> Prefer cheap/free providers</label>
            <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={allowAdult} onChange={(e) => setAllowAdult(e.target.checked)} /> Allow adult-safe app package</label>
            <button onClick={generate} disabled={loading || !appSlug || !appName} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 disabled:opacity-40">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Generate AI package
            </button>
            {error && <p className="rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-xs text-red-200">{error}</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          {!pkg ? (
            <div className="flex min-h-[420px] items-center justify-center text-center text-sm text-slate-500">
              Fill in app details and generate an AI package.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">{pkg.appName}</h2>
                  <p className="text-xs text-slate-500">{pkg.appSlug} · {pkg.appType} · {pkg.safetyProfile}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs ${pkg.status === 'ready' ? 'bg-emerald-400/10 text-emerald-200' : 'bg-amber-400/10 text-amber-200'}`}>{pkg.status}</span>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4"><CheckCircle className="mb-2 h-4 w-4 text-emerald-300" /><p className="text-xs text-slate-500">Capabilities</p><p className="text-xl font-bold text-white">{pkg.enabledCapabilityIds.length}</p></div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4"><WalletCards className="mb-2 h-4 w-4 text-cyan-300" /><p className="text-xs text-slate-500">Budget</p><p className="text-xl font-bold text-white">${pkg.budget?.monthlyUsd ?? 0}/mo</p></div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4"><Shield className="mb-2 h-4 w-4 text-violet-300" /><p className="text-xs text-slate-500">Requires approval</p><p className="text-xl font-bold text-white">Yes</p></div>
              </div>

              {pkg.blockers.length > 0 && <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs text-amber-100">{pkg.blockers.join('\n')}</div>}

              <div className="overflow-hidden rounded-xl border border-white/10">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-3 py-2">Capability</th><th className="px-3 py-2">Provider</th><th className="px-3 py-2">Model</th><th className="px-3 py-2">Fallback</th></tr></thead>
                  <tbody>
                    {pkg.selections.map((selection) => (
                      <tr key={selection.capabilityId} className="border-b border-white/[0.04]"><td className="px-3 py-2 text-white">{selection.capabilityId}</td><td className="px-3 py-2 text-cyan-200">{selection.provider || '—'}</td><td className="px-3 py-2 font-mono text-slate-400">{selection.modelId || '—'}</td><td className="px-3 py-2 text-slate-500">{selection.fallbackProvider || '—'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="mb-2 text-xs font-semibold text-white">Permissions</p>
                <div className="flex flex-wrap gap-2">{Object.entries(pkg.permissions).map(([key, value]) => <span key={key} className={`rounded-full px-2 py-1 text-[10px] ${value ? 'bg-cyan-400/10 text-cyan-100' : 'bg-white/5 text-slate-500'}`}>{key}: {String(value)}</span>)}</div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
