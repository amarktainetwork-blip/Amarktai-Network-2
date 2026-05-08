'use client'

import { useEffect, useState } from 'react'
import { Eye, EyeOff, Save } from 'lucide-react'
import { APPROVED_AI_PROVIDERS } from '@/lib/approved-ai-catalog'
import { ADULT_POLICY_VALUES } from '@/lib/universal-model-catalog'
import type { SettingsTruthEntry } from '@/lib/platform-settings-truth'

const TOOL_KEYS = [
  { key: 'genx', label: 'GenX', description: 'Primary model broker. Unlocks routed Studio execution.', placeholder: 'genx key' },
  { key: 'github', label: 'GitHub', description: 'Repository import, branches, PRs, merge, and deploy handoff.', placeholder: 'ghp_...' },
  { key: 'redis', label: 'Redis', description: 'Queues, job coordination, and live job state.', placeholder: 'REDIS_URL' },
  { key: 'firecrawl', label: 'Firecrawl', description: 'Research and scraping tool.', placeholder: 'fc_...' },
  { key: 'crawl4ai', label: 'Crawl4AI', description: 'Research and scraping tool.', placeholder: 'crawl4ai key' },
  { key: 'playwright', label: 'Playwright', description: 'Browser automation and verification tool.', placeholder: 'local tool' },
  { key: 'webdock', label: 'Webdock', description: 'VPS and system monitoring.', placeholder: 'webdock key' },
  { key: 'smtp', label: 'SMTP / email', description: 'Email notifications and operator alerts.', placeholder: 'SMTP_HOST' },
  { key: 'storage', label: 'Storage', description: 'Artifacts, logs, and generated reports.', placeholder: 'storage credentials' },
]

type SettingsTruth = {
  providers: SettingsTruthEntry[]
  tools: SettingsTruthEntry[]
  storage: SettingsTruthEntry
  connectedCount: number
}

export default function SettingsPage() {
  const [truth, setTruth] = useState<SettingsTruth | null>(null)

  useEffect(() => {
    fetch('/api/admin/settings/status')
      .then((response) => response.json())
      .then((data) => setTruth(data.truth ?? null))
      .catch(() => setTruth(null))
  }, [])

  const statusFor = (key: string, kind: 'provider' | 'tool' | 'storage') => {
    if (kind === 'provider') return truth?.providers.find((item) => item.key === key)
    if (kind === 'storage') return truth?.storage
    return truth?.tools.find((item) => item.key === key)
  }
  const checklist = [
    ['Providers connected', truth ? truth.providers.some((item) => item.connected) : false],
    ['GitHub tested', statusFor('github', 'tool')?.connected ?? false],
    ['Storage writable route present', truth?.storage.connected ?? false],
    ['Research tool configured', ['firecrawl', 'crawl4ai', 'playwright'].some((key) => statusFor(key, 'tool')?.configured)],
    ['Workbench unlocks available', Boolean(statusFor('github', 'tool')?.configured && truth?.storage.configured)],
  ] as const

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl lg:p-7">
        <div className="pointer-events-none absolute right-0 top-0 h-48 w-72 rounded-bl-[6rem] bg-gradient-to-br from-sky-500/8 via-cyan-500/5 to-transparent blur-3xl" />
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-400/80">Settings</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-100 lg:text-3xl">Provider keys, routing, and deployment.</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Configure AI providers, voice defaults, model routing, GitHub, Webdock, research tools, storage, adult policy, and deployment defaults.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/50 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <p className="text-xs font-bold text-slate-300">Connected keys with passed live tests: {truth?.connectedCount ?? 0}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl">
        <h2 className="text-sm font-black text-slate-200">Setup completion checklist</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {checklist.map(([label, passed]) => (
            <div key={label} className={['rounded-xl border p-3', passed ? 'border-emerald-500/20 bg-emerald-500/8' : 'border-amber-500/20 bg-amber-500/8'].join(' ')}>
              <p className={['text-xs font-black', passed ? 'text-emerald-300' : 'text-amber-300'].join(' ')}>{passed ? 'Ready' : 'Blocker'}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI Providers */}
      <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl">
        <h2 className="text-sm font-black text-slate-200">AI providers</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {APPROVED_AI_PROVIDERS.map((provider) => (
            <KeyForm
              key={provider.key}
              keyId={provider.key}
              type="provider"
              label={provider.settingsLabel}
              description={provider.notes}
              placeholder={provider.envVars[0]}
              truth={statusFor(provider.key, 'provider')}
            />
          ))}
        </div>
      </section>

      {/* Tools & Services */}
      <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl">
        <h2 className="text-sm font-black text-slate-200">Tools & system services</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {TOOL_KEYS.map((tool) => (
            <KeyForm
              key={tool.key}
              keyId={tool.key}
              type="tool"
              label={tool.label}
              description={tool.description}
              placeholder={tool.placeholder}
              truth={statusFor(tool.key, tool.key === 'storage' ? 'storage' : 'tool')}
            />
          ))}
        </div>
      </section>

      {/* Adult policy */}
      <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl">
        <h2 className="text-sm font-black text-slate-200">Adult policy defaults</h2>
        <p className="mt-1.5 max-w-3xl text-xs leading-5 text-slate-500">
          Adult capability is app-policy gated and uses approved providers — it does not require a separate adult key.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {ADULT_POLICY_VALUES.map((policy) => (
            <span key={policy} className="rounded-full border border-slate-700/40 bg-slate-800/40 px-2.5 py-1 text-xs font-bold text-slate-400">{policy}</span>
          ))}
        </div>
      </section>
    </div>
  )
}

function KeyForm({ keyId, type, label, description, placeholder, truth }: { keyId: string; type: 'provider' | 'tool'; label: string; description: string; placeholder: string; truth?: SettingsTruthEntry }) {
  const [value, setValue] = useState('')
  const [show, setShow] = useState(false)
  const [status, setStatus] = useState('')

  const statusColor = truth?.status === 'Connected'
    ? 'border-emerald-500/20 bg-emerald-500/8 text-emerald-400'
    : truth?.status === 'Configured' || truth?.status === 'Configured - needs live test' || truth?.status === 'Needs key' || truth?.status === 'Needs live test' || truth?.status === 'Needs test route'
      ? 'border-amber-500/20 bg-amber-500/8 text-amber-400'
      : truth?.status === 'Failed'
        ? 'border-red-500/20 bg-red-500/8 text-red-400'
        : 'border-slate-700/40 bg-slate-800/40 text-slate-500'

  async function saveKey() {
    if (!value.trim()) return
    setStatus('Saving…')
    const response = await fetch('/api/admin/settings/key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: keyId, type, label, value }),
    })
    const data = await response.json().catch(() => ({}))
    setStatus(response.ok ? `Saved ${data.masked ?? ''}` : data.error ?? 'Save failed')
    if (response.ok) setValue('')
  }

  return (
    <div className="rounded-xl border border-slate-700/40 bg-slate-800/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-200">{label}</p>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        <span className={['rounded-full border px-2 py-0.5 text-[10px] font-bold', statusColor].join(' ')}>
          {truth?.status ?? 'Needs key'}
        </span>
      </div>
      {truth?.testRoute && (
        <p className="mt-2 text-[10px] font-semibold text-slate-600">
          {truth.testRoute}{truth.source && truth.source !== 'missing' ? ` · ${truth.source}` : ''}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder={placeholder}
            className="w-full rounded-xl border border-slate-700/50 bg-slate-900/60 px-3 py-2 pr-9 text-sm font-semibold text-slate-300 outline-none placeholder:text-slate-600 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-300"
            aria-label={show ? 'Hide key' : 'Show key'}
          >
            {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
        <button onClick={saveKey} className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3 py-2 text-sm font-black text-slate-950 transition hover:bg-cyan-400">
          <Save className="h-3.5 w-3.5" />
          Save
        </button>
      </div>
      {status && <p className="mt-1.5 text-xs font-semibold text-slate-500">{status}</p>}
    </div>
  )
}
