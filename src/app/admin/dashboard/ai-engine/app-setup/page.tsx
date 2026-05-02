'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Boxes, Loader2, Save, Sparkles } from 'lucide-react'

interface AppPackage {
  appSlug: string
  appName: string
  appType: string
  safetyProfile: string
  enabledCapabilityIds: string[]
  selections: Array<{ capabilityId: string; provider: string; modelId: string; fallbackProvider?: string; notes?: string }>
  permissions: Record<string, boolean>
  budget?: { mode: string; monthlyUsd?: number; maxPerRequestUsd?: number }
  blockers: string[]
  status: 'draft' | 'ready' | 'needs_configuration' | 'blocked'
  savedAt?: string
  updatedAt?: string
  version?: number
}

export default function AppAiSetupPage() {
  const [appSlug, setAppSlug] = useState('future-marketing-app')
  const [appName, setAppName] = useState('Future Marketing App')
  const [appType, setAppType] = useState('marketing')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [preferCheap, setPreferCheap] = useState(true)
  const [allowAdult, setAllowAdult] = useState(false)
  const [pkg, setPkg] = useState<AppPackage | null>(null)
  const [savedPackages, setSavedPackages] = useState<AppPackage[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function loadSaved() {
    const res = await fetch('/api/admin/app-ai-package')
    const data = await res.json()
    if (res.ok && data.success !== false) setSavedPackages(data.packages ?? [])
  }

  useEffect(() => { loadSaved().catch(() => null) }, [])

  async function recommend() {
    setLoading(true)
    setError('')
    setNotice('')
    setPkg(null)
    try {
      const body: Record<string, unknown> = { appSlug, appName, appType, preferCheap, allowAdult }
      if (websiteUrl.trim()) body.websiteUrl = websiteUrl.trim()
      const res = await fetch('/api/admin/app-ai-package/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok || data.success === false) throw new Error(data.error ?? 'Failed to recommend app AI package')
      setPkg(data.package)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to recommend package')
    } finally {
      setLoading(false)
    }
  }

  async function savePackage() {
    if (!pkg) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const res = await fetch('/api/admin/app-ai-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pkg),
      })
      const data = await res.json()
      if (!res.ok || data.success === false) throw new Error(data.error ?? 'Failed to save app AI package')
      setPkg(data.package)
      setNotice(`Saved ${data.package.appSlug} v${data.package.version}`)
      await loadSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save package')
    } finally {
      setSaving(false)
    }
  }

  function loadPackage(saved: AppPackage) {
    setPkg(saved)
    setAppSlug(saved.appSlug)
    setAppName(saved.appName)
    setAppType(saved.appType)
    setNotice(`Loaded saved package ${saved.appSlug}`)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-[#0d1a2e] to-[#060d1b] p-6">
        <Link href="/admin/dashboard/ai-engine" className="mb-4 inline-flex items-center gap-2 text-xs text-slate-500 hover:text-cyan-300"><ArrowLeft className="h-3.5 w-3.5" /> AI Engine</Link>
        <div className="flex items-center gap-2"><Boxes className="h-6 w-6 text-cyan-300" /><h1 className="text-2xl font-bold text-white">App AI Setup</h1></div>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">Create and save a per-app AI package. No global default: each app gets its own capabilities, providers, models, budgets and permissions.</p>
      </div>

      {savedPackages.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="mb-3 text-sm font-bold text-white">Saved packages</h2>
          <div className="flex flex-wrap gap-2">
            {savedPackages.map((saved) => (
              <button key={saved.appSlug} onClick={() => loadPackage(saved)} className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-slate-300 hover:border-cyan-400/30 hover:text-cyan-100">
                {saved.appName} · v{saved.version ?? 1}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="App Slug" value={appSlug} onChange={setAppSlug} />
          <Field label="App Name" value={appName} onChange={setAppName} />
          <label className="space-y-1 text-xs text-slate-500">App Type
            <select value={appType} onChange={(e) => setAppType(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none">
              <option value="marketing">Marketing</option>
              <option value="learning-courses">Learning / Courses</option>
              <option value="adult-companion">Adult Companion</option>
              <option value="horse-equine-management">Horse / Equine</option>
              <option value="religious-content">Religious Content</option>
              <option value="travel-planning">Travel Planning</option>
              <option value="ai-operating-system">AI Operating System</option>
              <option value="general">General</option>
            </select>
          </label>
          <Field label="Website URL, optional" value={websiteUrl} onChange={setWebsiteUrl} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={preferCheap} onChange={(e) => setPreferCheap(e.target.checked)} /> Prefer cheap/free AI</label>
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={allowAdult} onChange={(e) => setAllowAdult(e.target.checked)} /> Allow adult app package</label>
          <button onClick={recommend} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 disabled:opacity-40">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Recommend package</button>
          <button onClick={savePackage} disabled={!pkg || saving} className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-100 disabled:opacity-40">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save package</button>
        </div>
      </section>

      {notice && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">{notice}</div>}
      {error && <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>}

      {pkg && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-lg font-bold text-white">{pkg.appName}</p>
                <p className="text-xs text-slate-500">{pkg.appSlug} · {pkg.appType} · {pkg.safetyProfile}{pkg.version ? ` · v${pkg.version}` : ''}</p>
              </div>
              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-100">{pkg.status}</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Metric label="Capabilities" value={`${pkg.enabledCapabilityIds.length}`} />
              <Metric label="Budget" value={`${pkg.budget?.mode ?? '—'} / $${pkg.budget?.monthlyUsd ?? 0}`} />
              <Metric label="Blockers" value={`${pkg.blockers.length}`} />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="mb-3 text-sm font-bold text-white">Provider/model selections</h2>
            <div className="space-y-2">
              {pkg.selections.map((selection) => (
                <div key={selection.capabilityId} className="grid gap-2 rounded-xl border border-white/10 bg-black/20 p-3 text-xs md:grid-cols-[1fr_1fr_1fr]">
                  <span className="font-mono text-slate-300">{selection.capabilityId}</span>
                  <span className="text-cyan-200">{selection.provider || 'not selected'}</span>
                  <span className="truncate text-slate-400">{selection.modelId || 'not selected'}</span>
                </div>
              ))}
            </div>
          </div>

          {pkg.blockers.length > 0 && <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">{pkg.blockers.join('\n')}</div>}
        </section>
      )}
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="space-y-1 text-xs text-slate-500">{label}<input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none" /></label>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-600">{label}</p><p className="mt-1 font-semibold text-white">{value}</p></div>
}
