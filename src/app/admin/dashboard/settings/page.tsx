'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Eye, EyeOff, Loader2, Save, TestTube2 } from 'lucide-react'
import type { SettingsTruthEntry } from '@/lib/platform-settings-truth'

type SettingsTruth = {
  entries: SettingsTruthEntry[]
  connectedCount: number
}

type SettingsTab = 'providers' | 'infrastructure' | 'storage' | 'knowledge' | 'apps' | 'voice' | 'legal'

const tabs: Array<{ id: SettingsTab; label: string; hint: string }> = [
  { id: 'providers', label: 'Providers', hint: 'Model and media provider keys/tests' },
  { id: 'infrastructure', label: 'Infrastructure', hint: 'GitHub, Webdock, browser, crawler, worker-adjacent tools' },
  { id: 'storage', label: 'Storage', hint: 'Artifact and local VPS storage proof' },
  { id: 'knowledge', label: 'Knowledge', hint: 'RAG, crawl, scrape, retrieval dependencies' },
  { id: 'apps', label: 'Apps', hint: 'App profile setup hooks' },
  { id: 'voice', label: 'Voice', hint: 'Voice defaults and future assistant routes' },
  { id: 'legal', label: 'Legal/Safety', hint: 'Policy and safety switches' },
]

export default function SettingsPage() {
  const [truth, setTruth] = useState<SettingsTruth | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<SettingsTab>('providers')

  const refresh = useCallback(async () => {
    setLoading(true)
    const response = await fetch('/api/admin/settings/status', { cache: 'no-store' })
    const data = await response.json().catch(() => ({}))
    setTruth(response.ok ? data.truth ?? null : null)
    setLoading(false)
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const entries = useMemo(() => groupEntries(truth?.entries ?? [], activeTab), [truth?.entries, activeTab])

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-[#071019] p-6 lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Settings</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white lg:text-5xl">Connection centre</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
              Save secrets, test providers, and configure platform dependencies from one place. Provider key tests do not appear anywhere else in the dashboard.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2 text-xs font-bold text-slate-300">
            {loading ? <Loader2 className="h-4 w-4 animate-spin text-cyan-300" /> : <CheckCircle2 className="h-4 w-4 text-emerald-300" />}
            {truth?.connectedCount ?? 0} live connections
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-2">
        <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="Settings sections">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={`${tab.id}-tab`}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                'shrink-0 rounded-xl border px-4 py-3 text-left transition',
                activeTab === tab.id ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100' : 'border-transparent text-slate-500 hover:bg-slate-800/70 hover:text-slate-300',
              ].join(' ')}
            >
              <span className="block text-xs font-black">{tab.label}</span>
              <span className="mt-1 block max-w-44 text-[11px] leading-4 opacity-75">{tab.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2" role="tabpanel" aria-labelledby={`${activeTab}-tab`}>
        {entries.length ? entries.map((entry) => (
          <ConnectionCard key={entry.key} entry={entry} refresh={refresh} />
        )) : (
          <EmptySection tab={activeTab} />
        )}
      </section>
    </div>
  )
}

function groupEntries(entries: SettingsTruthEntry[], tab: SettingsTab): SettingsTruthEntry[] {
  if (tab === 'providers') return entries.filter((entry) => entry.kind === 'provider')
  if (tab === 'storage') return entries.filter((entry) => entry.kind === 'storage' || entry.capabilities.some((capability) => capability.includes('artifact') || capability.includes('storage')))
  if (tab === 'knowledge') return entries.filter((entry) => entry.capabilities.some((capability) => /(rag|research|crawl|scrape|retrieval|embedding)/i.test(capability)))
  if (tab === 'infrastructure') {
    const knowledgeEntries = new Set(groupEntries(entries, 'knowledge'))
    return entries.filter((entry) => entry.kind === 'tool' && !knowledgeEntries.has(entry))
  }
  return []
}

function EmptySection({ tab }: { tab: SettingsTab }) {
  const copy: Record<SettingsTab, string> = {
    providers: 'No provider entries returned by the settings truth API.',
    infrastructure: 'No infrastructure tool entries are available in the settings truth API.',
    storage: 'No storage entry returned by the settings truth API.',
    knowledge: 'No knowledge-specific connection entries are available yet.',
    apps: 'App creation is not wired here yet. Use this section later for app profile defaults and template publishing.',
    voice: 'Voice defaults are UI-ready. Session, streaming, and app reuse endpoints still need backend wiring.',
    legal: 'Legal and safety controls remain backend-owned. Add editable policy controls only when the backend contract exists.',
  }
  return <p className="col-span-full rounded-2xl border border-slate-800 bg-slate-950/55 p-6 text-sm leading-7 text-slate-500">{copy[tab]}</p>
}

function ConnectionCard({ entry, refresh }: { entry: SettingsTruthEntry; refresh: () => Promise<void> }) {
  const [value, setValue] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState<'save' | 'test' | null>(null)
  const [message, setMessage] = useState('')

  async function save() {
    if (!value.trim()) return
    setBusy('save')
    setMessage('')
    const response = await fetch('/api/admin/settings/key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: entry.key,
        type: entry.kind === 'provider' ? 'provider' : 'tool',
        label: entry.label,
        value: value.trim(),
      }),
    })
    const data = await response.json().catch(() => ({}))
    setMessage(response.ok ? `Saved ${data.masked ?? ''}. Run the live test.` : data.error ?? 'Save failed.')
    if (response.ok) {
      setValue('')
      await refresh()
    }
    setBusy(null)
  }

  async function test() {
    setBusy('test')
    setMessage('')
    const response = await fetch(entry.testRoute, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: entry.key }),
    })
    const data = await response.json().catch(() => ({}))
    setMessage(data.success ? data.detail || 'Live test passed.' : data.error || 'Live test failed.')
    await refresh()
    setBusy(null)
  }

  const statusStyle = entry.connected
    ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'
    : entry.status === 'Failed'
      ? 'border-red-400/25 bg-red-400/10 text-red-300'
      : 'border-amber-400/25 bg-amber-400/10 text-amber-300'

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/65 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-black text-white">{entry.label}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">{entry.optional ? 'Optional connection.' : 'Platform connection.'} Unlocks {entry.unlocks || 'platform capability'}.</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${statusStyle}`}>{entry.status}</span>
      </div>

      {entry.requiresSecret && (
        <div className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder={entry.envVars.join(' or ')}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 pr-10 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/50"
            />
            <button type="button" onClick={() => setShow((current) => !current)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500" aria-label={show ? 'Hide value' : 'Show value'}>
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <button onClick={save} disabled={busy !== null || !value.trim()} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-black text-slate-200 disabled:opacity-40">
            {busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </button>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-400">{entry.lastTestResult}</p>
          <p className="mt-1 text-[11px] text-slate-500">{entry.lastTestedAt ? new Date(entry.lastTestedAt).toLocaleString() : entry.blocker}</p>
          {entry.error && <p className="mt-1 text-xs font-semibold text-red-300">{entry.error}</p>}
          {message && <p className="mt-1 text-xs font-semibold text-cyan-200">{message}</p>}
        </div>
        <button onClick={test} disabled={busy !== null || (!entry.configured && entry.requiresSecret)} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-cyan-300 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-40">
          {busy === 'test' ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />} Test
        </button>
      </div>
    </article>
  )
}
