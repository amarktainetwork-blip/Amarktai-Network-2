'use client'

import { useState } from 'react'
import { Eye, EyeOff, Save } from 'lucide-react'
import { APPROVED_AI_PROVIDERS } from '@/lib/approved-ai-catalog'
import { ADULT_POLICY_VALUES } from '@/lib/universal-model-catalog'

const TOOL_KEYS = [
  { key: 'github', label: 'GitHub', description: 'Repository import, branches, PRs, merge, and deploy handoff.', placeholder: 'ghp_...' },
  { key: 'firecrawl', label: 'Firecrawl', description: 'Research and scraping tool.', placeholder: 'fc_...' },
  { key: 'crawl4ai', label: 'Crawl4AI', description: 'Research and scraping tool.', placeholder: 'crawl4ai key' },
  { key: 'playwright', label: 'Playwright', description: 'Browser automation and verification tool.', placeholder: 'local tool' },
  { key: 'webdock', label: 'Webdock', description: 'VPS and system monitoring.', placeholder: 'webdock key' },
  { key: 'storage', label: 'Storage', description: 'Artifacts, logs, and generated reports.', placeholder: 'storage credentials' },
]

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-[0_24px_100px_rgba(15,23,42,0.12)] backdrop-blur-2xl lg:p-8">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-700">Settings</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">Provider keys, routing defaults, and deployment controls.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Configure the one universal provider catalog, assistant defaults, voice defaults, model defaults, GitHub, Webdock, research tools, storage, adult policy defaults, and deployment defaults.
        </p>
      </section>

      <section className="rounded-3xl border border-white/70 bg-white/65 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl">
        <h2 className="text-xl font-black text-slate-950">AI providers</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {APPROVED_AI_PROVIDERS.map((provider) => (
            <KeyForm
              key={provider.key}
              keyId={provider.key}
              type="provider"
              label={provider.settingsLabel}
              description={provider.notes}
              placeholder={provider.envVars[0]}
            />
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-white/70 bg-white/65 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl">
        <h2 className="text-xl font-black text-slate-950">Tools and system services</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {TOOL_KEYS.map((tool) => (
            <KeyForm
              key={tool.key}
              keyId={tool.key}
              type="tool"
              label={tool.label}
              description={tool.description}
              placeholder={tool.placeholder}
            />
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-white/70 bg-white/65 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl">
        <h2 className="text-xl font-black text-slate-950">Adult policy defaults</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Adult capability is app-policy gated and uses the same approved providers. It does not require a separate adult key.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {ADULT_POLICY_VALUES.map((policy) => (
            <span key={policy} className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-800">{policy}</span>
          ))}
        </div>
      </section>
    </div>
  )
}

function KeyForm({ keyId, type, label, description, placeholder }: { keyId: string; type: 'provider' | 'tool'; label: string; description: string; placeholder: string }) {
  const [value, setValue] = useState('')
  const [show, setShow] = useState(false)
  const [status, setStatus] = useState('')

  async function saveKey() {
    if (!value.trim()) return
    setStatus('Saving')
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
    <div className="rounded-3xl border border-slate-200 bg-white/75 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-950">{label}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500">Key vault</span>
      </div>
      <div className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder={placeholder}
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 pr-10 text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
          />
          <button
            type="button"
            onClick={() => setShow((next) => !next)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:text-slate-950"
            aria-label={show ? 'Hide key' : 'Show key'}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <button onClick={saveKey} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-3 py-2 text-sm font-black text-white hover:bg-slate-800">
          <Save className="h-4 w-4" />
          Save
        </button>
      </div>
      {status && <p className="mt-2 text-xs text-slate-500">{status}</p>}
    </div>
  )
}
