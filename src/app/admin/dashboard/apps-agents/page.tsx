'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, RefreshCw, Zap } from 'lucide-react'
import { OPERATOR_AGENTS, listOperatorAgents } from '@/lib/agent-registry'
import { EXTERNAL_APP_ONBOARDING_LABEL, ROOT_WORKSPACE } from '@/lib/provider-capability-governance'

const appFields = [
  'name', 'slug', 'domain/subdomain', 'repo', 'VPS path', 'service name',
  'health endpoint', 'app type', 'assigned agents', 'assigned model package',
  'memory namespace', 'storage namespace', 'adult policy', 'deployment profile', 'status',
]

const appTypes = ['companion/chat', 'marketing', 'coding/dev', 'research', 'media/avatar', 'operations', 'custom']
const adultPolicyOptions = ['off', 'suggestive', 'adult_text', 'adult_image', 'full_adult_app_mode']
const deploymentTargets = ['VPS/systemd', 'Docker', 'Vercel', 'Netlify', 'Custom']
const capabilityOptions = ['chat', 'research', 'image_generation', 'music_generation', 'tts', 'coding', 'adult_text', 'adult_image']

type LocalApp = { id: string; name: string; slug: string; status: string; type: string; description?: string }
type AgentSummary = ReturnType<typeof listOperatorAgents>[number]

const agents = listOperatorAgents(ROOT_WORKSPACE.appSlug)
const availableAgents = agents.filter((a) => a.status === 'available')
const unavailableAgents = agents.filter((a) => a.status !== 'available')

function groupAgents(agentList: AgentSummary[]) {
  const groups: Record<string, AgentSummary[]> = {
    'Build & Code': [],
    Research: [],
    'Creative Media': [],
    Operations: [],
    Safety: [],
    Memory: [],
  }
  for (const agent of agentList) {
    const text = `${agent.name} ${agent.purpose} ${agent.allowedCapabilities.join(' ')}`.toLowerCase()
    if (text.includes('code') || text.includes('repo') || text.includes('deploy')) groups['Build & Code'].push(agent)
    else if (text.includes('research') || text.includes('scrap') || text.includes('crawl')) groups.Research.push(agent)
    else if (text.includes('image') || text.includes('video') || text.includes('audio') || text.includes('voice') || text.includes('creative')) groups['Creative Media'].push(agent)
    else if (text.includes('safe') || text.includes('policy') || text.includes('moderation')) groups.Safety.push(agent)
    else if (text.includes('memory') || text.includes('learn')) groups.Memory.push(agent)
    else groups.Operations.push(agent)
  }
  return groups
}

const groupedAgents = groupAgents(availableAgents)

const blankForm = {
  name: '',
  type: 'companion/chat',
  repo: '',
  domain: '',
  vpsPath: '/var/www/amarktai/apps',
  capabilities: [] as string[],
  adultPolicy: 'off',
  deploymentTarget: 'VPS/systemd',
}

export default function AppsAgentsPage() {
  const [liveApps, setLiveApps] = useState<LocalApp[]>([])
  const [loading, setLoading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(blankForm)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  const loadApps = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/apps')
      const data = await res.json().catch(() => ({}))
      setLiveApps(Array.isArray(data.apps) ? (data.apps as LocalApp[]) : [])
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadApps().catch(() => null) }, [loadApps])

  async function saveNewApp() {
    if (!form.name.trim()) { setSaveMsg('App name is required.'); return }
    setSaving(true)
    setSaveMsg('')
    try {
      const res = await fetch('/api/admin/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          repo: form.repo,
          domain: form.domain,
          vpsPath: form.vpsPath,
          capabilities: form.capabilities,
          adultPolicy: form.adultPolicy,
          deploymentTarget: form.deploymentTarget,
          slug: form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          description: `${form.type} app — ${form.name}`,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setSaveMsg('App added.')
        setForm(blankForm)
        setAddOpen(false)
        await loadApps()
      } else {
        setSaveMsg(data.error ?? 'Save failed')
      }
    } catch { setSaveMsg('Request failed') } finally { setSaving(false) }
  }

  function toggleCapability(cap: string) {
    setForm((current) => ({
      ...current,
      capabilities: current.capabilities.includes(cap)
        ? current.capabilities.filter((c) => c !== cap)
        : [...current.capabilities, cap],
    }))
  }

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl lg:p-7">
        <div className="pointer-events-none absolute right-0 top-0 h-48 w-72 rounded-bl-[6rem] bg-gradient-to-br from-violet-500/8 via-cyan-500/5 to-transparent blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-400/80">Apps & Agents</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-100 lg:text-3xl">Root workspace active.</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              {ROOT_WORKSPACE.message} Build, connect, and deploy AI-native apps from this workspace.
            </p>
          </div>
          <button
            onClick={() => setAddOpen((v) => !v)}
            className="flex shrink-0 items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-black text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.1)] transition hover:bg-cyan-500/15"
          >
            <Plus className="h-4 w-4" />
            Add new app
          </button>
        </div>
      </section>

      {/* Add App Flow */}
      {addOpen && (
        <section className="rounded-2xl border border-cyan-500/20 bg-slate-900/80 p-5 backdrop-blur-xl shadow-[0_0_40px_rgba(34,211,238,0.06)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-400/80">App Builder</p>
              <h3 className="mt-1 text-base font-black text-slate-100">Add new app</h3>
            </div>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <AppField label="App name / idea">
              <input
                value={form.name}
                onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                placeholder="e.g. Crypto Trading Assistant"
                className="app-input"
              />
            </AppField>
            <AppField label="App type">
              <select value={form.type} onChange={(e) => setForm((c) => ({ ...c, type: e.target.value }))} className="app-input">
                {appTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </AppField>
            <AppField label="Repo (GitHub full name)">
              <input
                value={form.repo}
                onChange={(e) => setForm((c) => ({ ...c, repo: e.target.value }))}
                placeholder="owner/repo-name"
                className="app-input"
              />
            </AppField>
            <AppField label="Domain / subdomain">
              <input
                value={form.domain}
                onChange={(e) => setForm((c) => ({ ...c, domain: e.target.value }))}
                placeholder="app.example.com"
                className="app-input"
              />
            </AppField>
            <AppField label="VPS path">
              <input
                value={form.vpsPath}
                onChange={(e) => setForm((c) => ({ ...c, vpsPath: e.target.value }))}
                placeholder="/var/www/amarktai/apps/myapp"
                className="app-input"
              />
            </AppField>
            <AppField label="Deployment target">
              <select value={form.deploymentTarget} onChange={(e) => setForm((c) => ({ ...c, deploymentTarget: e.target.value }))} className="app-input">
                {deploymentTargets.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </AppField>
            <AppField label="Adult policy">
              <select value={form.adultPolicy} onChange={(e) => setForm((c) => ({ ...c, adultPolicy: e.target.value }))} className="app-input">
                {adultPolicyOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </AppField>
          </div>
          <div className="mt-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Capabilities</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {capabilityOptions.map((cap) => {
                const on = form.capabilities.includes(cap)
                return (
                  <button
                    key={cap}
                    type="button"
                    onClick={() => toggleCapability(cap)}
                    className={[
                      'rounded-full border px-2.5 py-1 text-xs font-bold transition',
                      on ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300' : 'border-slate-700/40 bg-slate-800/40 text-slate-500 hover:border-slate-600 hover:text-slate-300',
                    ].join(' ')}
                  >
                    {cap}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={saveNewApp}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-black text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.25)] transition hover:bg-cyan-400 disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Add app
            </button>
            <button onClick={() => { setAddOpen(false); setSaveMsg('') }} className="rounded-xl border border-slate-700/60 bg-slate-800/50 px-4 py-2.5 text-sm font-bold text-slate-400 transition hover:bg-slate-800">Cancel</button>
            {saveMsg && <p className={['text-sm font-bold', saveMsg === 'App added.' ? 'text-emerald-400' : 'text-amber-400'].join(' ')}>{saveMsg}</p>}
          </div>
        </section>
      )}

      {/* Connected Apps */}
      <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400/80">Connected apps</p>
            <h3 className="mt-1 text-sm font-black text-slate-200">{liveApps.length > 0 ? `${liveApps.length} apps registered` : 'No apps registered yet'}</h3>
          </div>
          <button onClick={() => loadApps().catch(() => null)} disabled={loading} className="rounded-lg border border-slate-700/60 bg-slate-800/50 p-2 text-slate-500 hover:text-slate-300 disabled:opacity-40">
            <RefreshCw className={['h-3.5 w-3.5', loading ? 'animate-spin' : ''].join(' ')} />
          </button>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {liveApps.map((app) => (
            <article key={app.id} className="rounded-xl border border-slate-700/40 bg-slate-800/50 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-black text-slate-100">{app.name}</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">{app.slug} · {app.type}</p>
                </div>
                <span className={[
                  'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black',
                  app.status === 'ready' ? 'border-emerald-500/20 bg-emerald-500/8 text-emerald-300' : 'border-amber-500/20 bg-amber-500/8 text-amber-300',
                ].join(' ')}>{app.status}</span>
              </div>
              {app.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{app.description}</p>}
            </article>
          ))}
          {!liveApps.length && !loading && (
            <div className="col-span-full rounded-xl border border-slate-700/40 bg-slate-800/40 p-5 text-center">
              <p className="text-sm font-black text-slate-400">No apps found.</p>
              <p className="mt-1 text-xs text-slate-600">Use &quot;Add new app&quot; to register your first app.</p>
            </div>
          )}
        </div>
      </section>

      {/* Agent registry — secondary, collapsed */}
      <details className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl">
        <summary className="cursor-pointer text-sm font-black text-slate-200">Agent registry — {OPERATOR_AGENTS.length} internal agents</summary>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {Object.entries(groupedAgents).map(([group, groupAgents]) => (
            <div key={group} className="rounded-xl border border-slate-700/40 bg-slate-950/40 p-3">
              <p className="text-xs font-black text-slate-300">{group}</p>
              <div className="mt-3 grid gap-2">
                {groupAgents.map((agent) => <AgentCard key={agent.id} agent={agent} />)}
                {!groupAgents.length && <p className="text-xs font-semibold text-slate-600">No active agent in this group yet.</p>}
              </div>
            </div>
          ))}
        </div>
        <details className="mt-4 rounded-xl border border-slate-700/40 bg-slate-950/40 p-3">
          <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.14em] text-slate-500">Not available yet</summary>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {unavailableAgents.map((agent) => <AgentCard key={agent.id} agent={agent} />)}
            {!unavailableAgents.length && <p className="text-xs font-semibold text-slate-600">No unavailable agents reported.</p>}
          </div>
        </details>
      </details>

      {/* External app onboarding — advanced, collapsed */}
      <details className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl">
        <summary className="cursor-pointer text-sm font-black text-slate-200">{EXTERNAL_APP_ONBOARDING_LABEL}</summary>
        <p className="mt-2 text-xs leading-5 text-slate-500">External managed app package schema. Package store available. The root workspace does not need onboarding.</p>
        <div className="mt-4 grid gap-1.5 sm:grid-cols-2">
          {appFields.map((field) => (
            <div key={field} className="rounded-lg border border-slate-700/40 bg-slate-800/40 px-2.5 py-1.5 text-xs font-semibold text-slate-400">{field}</div>
          ))}
        </div>
        <p className="mt-4 text-xs font-black text-slate-300">App types</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {appTypes.map((type) => <span key={type} className="rounded-full border border-cyan-500/20 bg-cyan-500/8 px-2.5 py-1 text-xs font-bold text-cyan-400">{type}</span>)}
        </div>
      </details>
    </div>
  )
}

function AppField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <span className="mt-1.5 block [&_.app-input]:w-full [&_.app-input]:rounded-xl [&_.app-input]:border [&_.app-input]:border-slate-700/50 [&_.app-input]:bg-slate-800/60 [&_.app-input]:px-3 [&_.app-input]:py-2 [&_.app-input]:text-sm [&_.app-input]:font-semibold [&_.app-input]:text-slate-300 [&_.app-input]:outline-none [&_.app-input:focus]:border-cyan-500/50">{children}</span>
    </label>
  )
}

function AgentCard({ agent }: { agent: AgentSummary }) {
  return (
    <article className="rounded-xl border border-slate-700/40 bg-slate-800/50 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-200">{agent.name}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{agent.purpose}</p>
        </div>
        <span className={[
          'rounded-full border px-2 py-0.5 text-[10px] font-bold',
          agent.status === 'available' ? 'border-emerald-500/20 bg-emerald-500/8 text-emerald-400' : 'border-amber-500/20 bg-amber-500/8 text-amber-400',
        ].join(' ')}>{agent.status}</span>
      </div>
      <p className="mt-2 text-[10px] font-semibold text-slate-600">Capabilities: {agent.allowedCapabilities.join(', ')}</p>
      <p className="mt-0.5 text-[10px] font-semibold text-slate-600">Route: {agent.executionRoute ? `${agent.executionRoute.provider}/${agent.executionRoute.model}` : agent.unavailableReason}</p>
    </article>
  )
}
