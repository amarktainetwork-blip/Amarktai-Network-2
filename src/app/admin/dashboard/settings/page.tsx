'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Eye, EyeOff, Loader2, Save, TestTube2 } from 'lucide-react'
import type { SettingsTruthEntry } from '@/lib/platform-settings-truth'

type SettingsTruth = {
  entries: SettingsTruthEntry[]
  connectedCount: number
}

export default function SettingsPage() {
  const [truth, setTruth] = useState<SettingsTruth | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const response = await fetch('/api/admin/settings/status', { cache: 'no-store' })
    const data = await response.json().catch(() => ({}))
    setTruth(response.ok ? data.truth ?? null : null)
    setLoading(false)
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-cyan-400/20 bg-[linear-gradient(135deg,rgba(8,20,34,.96),rgba(4,9,18,.92))] p-6 lg:p-8">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Settings</p>
        <h1 className="mt-2 text-3xl font-black text-white">Connect capabilities once.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
          Add a key, save it, then run a live test. A connection turns green only after the provider or local service responds successfully.
        </p>
        <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2 text-xs font-bold text-slate-300">
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-cyan-300" /> : <CheckCircle2 className="h-4 w-4 text-emerald-300" />}
          {truth?.connectedCount ?? 0} live connections
        </div>
      </section>

      {/* Admin quick links */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { href: '/admin/dashboard/providers', label: 'Provider Settings', desc: 'Configure the 5 active AI providers' },
          { href: '/admin/dashboard/adult-mode', label: 'Adult Permissions', desc: 'Age gate, consent, and rights checks' },
          { href: '/admin/dashboard/vps-health', label: 'Storage & Artifact Status', desc: 'VPS readiness, disk, Qdrant, Redis' },
          { href: '/admin/dashboard/publishing', label: 'Publishing Credentials', desc: 'Platform export and publishing status' },
          { href: '/admin/dashboard/brand-memory', label: 'Brand Memory', desc: 'Brand profiles and guidelines' },
          { href: '/admin/dashboard/rag', label: 'Knowledge Base', desc: 'RAG ingestion and query' },
        ].map(({ href, label, desc }) => (
          <Link key={href} href={href} className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4 transition hover:border-cyan-500/20 hover:bg-slate-800/60">
            <p className="font-black text-slate-200 text-sm">{label}</p>
            <p className="mt-1 text-xs text-slate-500">{desc}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {(truth?.entries ?? []).map((entry) => (
          <ConnectionCard key={entry.key} entry={entry} refresh={refresh} />
        ))}
      </section>
    </div>
  )
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
    <article className="rounded-2xl border border-slate-700/50 bg-slate-900/65 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-black text-white">{entry.label}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {entry.optional ? 'Optional connection.' : 'Platform connection.'} Unlocks {entry.unlocks}.
          </p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${statusStyle}`}>{entry.status}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {entry.capabilities.map((capability) => (
          <span key={capability} className="rounded-full border border-slate-700 bg-slate-950/50 px-2 py-1 text-[10px] font-bold text-slate-400">
            {capability.replaceAll('_', ' ')}
          </span>
        ))}
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
