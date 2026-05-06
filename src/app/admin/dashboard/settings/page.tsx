'use client'

import { useState } from 'react'
import { Eye, EyeOff, Save } from 'lucide-react'
import { APPROVED_AI_PROVIDERS } from '@/lib/approved-ai-catalog'

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
      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Settings</p>
        <h1 className="mt-3 text-3xl font-black text-white">Approved keys and tools.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          AI providers are kept separate from research, browser, VPS, storage, and GitHub tools. GitHub credentials live here, not in the Workbench.
        </p>
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-base font-bold text-white">AI providers</h2>
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

      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-base font-bold text-white">Tools and system services</h2>
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
    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-white">{label}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-semibold text-slate-400">Key vault</span>
      </div>
      <div className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder={placeholder}
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 pr-10 text-sm text-white placeholder:text-slate-600"
          />
          <button
            type="button"
            onClick={() => setShow((next) => !next)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:text-white"
            aria-label={show ? 'Hide key' : 'Show key'}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <button onClick={saveKey} className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-400/15">
          <Save className="h-4 w-4" />
          Save
        </button>
      </div>
      {status && <p className="mt-2 text-xs text-slate-500">{status}</p>}
    </div>
  )
}
