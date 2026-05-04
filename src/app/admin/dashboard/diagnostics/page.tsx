'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Activity, RefreshCw, Server, Cpu, MemoryStick, HardDrive, Wifi, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react'

type TabId = 'readiness' | 'vps' | 'services' | 'providers' | 'jobs' | 'apps' | 'mcp'

interface VpsData {
  cpuPercent?: number
  ramPercent?: number
  diskPercent?: number
  ramUsedMb?: number
  ramTotalMb?: number
  diskUsedGb?: number
  diskTotalGb?: number
  timestamp?: string
  error?: string
  blocker?: string
}

interface JobStats {
  batch?: { processing?: number; failed?: number }
  video?: { processing?: number; failed?: number }
  queue?: { healthy?: boolean; backendAvailable?: boolean }
}

interface AppHealthEntry {
  id: number
  name: string
  slug: string
  status: string
  integration?: { healthStatus?: string; lastHeartbeatAt?: string | null } | null
}

interface GenxStatus {
  configured?: boolean
  available?: boolean
  error?: string | null
  modelCount?: number
}

type ReadinessStatus = 'PASS' | 'FAIL' | 'OPTIONAL' | 'DISABLED'

interface LiveReadiness {
  overall: 'PASS' | 'FAIL'
  generatedAt: string
  checks: Array<{
    key: string
    label: string
    status: ReadinessStatus
    evidence: string
    blocker: string | null
  }>
  counts: Record<string, number>
}

interface ToolRegistry {
  tools: Array<{
    id: string
    label: string
    category: string
    enabled: boolean
    wired: boolean
    permission: string
    approvalRequired: boolean
    requiredConfig: string[]
    endpoint: string | null
    lastError: string | null
  }>
  mcpServers?: { implemented: boolean; status: string; blocker: string }
}

function StatusBadge({ ok, label }: { ok: boolean | null; label?: string }) {
  if (ok === null) return <span className="text-[11px] text-slate-500 animate-pulse">Checking…</span>
  const cls = ok ? 'text-emerald-400' : 'text-red-400'
  const Icon = ok ? CheckCircle : XCircle
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] ${cls}`}>
      <Icon className="h-3.5 w-3.5" />
      {label ?? (ok ? 'OK' : 'Error')}
    </span>
  )
}

function MetricBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? 'bg-red-400' : pct >= 75 ? 'bg-amber-400' : 'bg-emerald-400'
  const text = pct >= 90 ? 'text-red-400' : pct >= 75 ? 'text-amber-400' : 'text-emerald-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className={`text-xs font-mono ${text} w-10 text-right`}>{pct.toFixed(0)}%</span>
    </div>
  )
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'readiness', label: 'Live Readiness' },
  { id: 'vps',       label: 'VPS'       },
  { id: 'services',  label: 'Services'  },
  { id: 'providers', label: 'Providers' },
  { id: 'jobs',      label: 'Job Queue' },
  { id: 'apps',      label: 'App Uptime'},
  { id: 'mcp',       label: 'MCP / Tools'},
]

export default function DiagnosticsPage() {
  const [tab, setTab] = useState<TabId>('readiness')
  const [loading, setLoading] = useState(false)
  const [vps, setVps] = useState<VpsData | null>(null)
  const [jobs, setJobs] = useState<JobStats | null>(null)
  const [apps, setApps] = useState<AppHealthEntry[]>([])
  const [genx, setGenx] = useState<GenxStatus | null>(null)
  const [readiness, setReadiness] = useState<LiveReadiness | null>(null)
  const [tools, setTools] = useState<ToolRegistry | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [vpsRes, jobsRes, appsRes, genxRes, readinessRes, toolsRes] = await Promise.allSettled([
        fetch('/api/admin/vps'),
        fetch('/api/admin/jobs'),
        fetch('/api/admin/app-health'),
        fetch('/api/admin/genx/status'),
        fetch('/api/admin/system/live-readiness'),
        fetch('/api/admin/tool-registry'),
      ])
      if (vpsRes.status === 'fulfilled' && vpsRes.value.ok) setVps(await vpsRes.value.json())
      else setVps({ error: 'VPS data unavailable — check server connection' })

      if (jobsRes.status === 'fulfilled' && jobsRes.value.ok) setJobs(await jobsRes.value.json())

      if (appsRes.status === 'fulfilled' && appsRes.value.ok) {
        const d = await appsRes.value.json()
        setApps(Array.isArray(d) ? d : (d?.products ?? []))
      }

      if (genxRes.status === 'fulfilled' && genxRes.value.ok) setGenx(await genxRes.value.json())
      if (readinessRes.status === 'fulfilled' && readinessRes.value.ok) setReadiness(await readinessRes.value.json())
      if (toolsRes.status === 'fulfilled' && toolsRes.value.ok) setTools(await toolsRes.value.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-[#0d1a2e] to-[#060d1b] p-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-6 w-6 text-cyan-400" />
            <h1 className="text-2xl font-bold text-white">Diagnostics</h1>
          </div>
          <p className="text-sm text-slate-400">VPS resources, services, provider health, job queue, and app uptime.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-xs text-slate-400 hover:text-white disabled:opacity-40 transition-all shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-white/[0.03] border border-white/[0.06] p-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              tab === t.id ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Live Readiness Tab */}
      {tab === 'readiness' && (
        <div className="space-y-4">
          <div className={`rounded-xl border p-4 ${readiness?.overall === 'PASS' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className={`text-sm font-semibold ${readiness?.overall === 'PASS' ? 'text-emerald-300' : 'text-red-300'}`}>
                  {readiness ? `Live readiness: ${readiness.overall}` : 'Live readiness: checking'}
                </p>
                <p className="text-xs text-slate-500">
                  This page checks runtime truth only. Disabled media or adult gates stay disabled until real providers pass.
                </p>
              </div>
              {readiness?.generatedAt && (
                <span className="text-[11px] text-slate-600">Generated {new Date(readiness.generatedAt).toLocaleString()}</span>
              )}
            </div>
          </div>

          {readiness ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {readiness.checks.map((item) => (
                <div key={item.key} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-white">{item.label}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      item.status === 'PASS' ? 'bg-emerald-500/10 text-emerald-300'
                      : item.status === 'FAIL' ? 'bg-red-500/10 text-red-300'
                      : item.status === 'DISABLED' ? 'bg-slate-500/10 text-slate-300'
                      : 'bg-amber-500/10 text-amber-300'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{item.evidence}</p>
                  {item.blocker && <p className="mt-2 text-xs text-amber-300">{item.blocker}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center text-sm text-slate-500">
              {loading ? 'Running live readiness checks...' : 'Live readiness data unavailable.'}
            </div>
          )}
        </div>
      )}

      {/* VPS Tab */}
      {tab === 'vps' && (
        <div className="space-y-4">
          {vps?.error || vps?.blocker ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-center gap-2 text-amber-400 text-sm">
                <AlertTriangle className="h-4 w-4" />
                {vps.error ?? vps.blocker}
              </div>
            </div>
          ) : vps ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wider">
                  <Cpu className="h-3.5 w-3.5" />CPU
                </div>
                <MetricBar pct={vps.cpuPercent ?? 0} />
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wider">
                  <MemoryStick className="h-3.5 w-3.5" />RAM
                </div>
                <MetricBar pct={vps.ramPercent ?? 0} />
                {vps.ramUsedMb != null && (
                  <p className="text-[11px] text-slate-600 font-mono">{(vps.ramUsedMb/1024).toFixed(1)} / {((vps.ramTotalMb ?? 0)/1024).toFixed(1)} GB</p>
                )}
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wider">
                  <HardDrive className="h-3.5 w-3.5" />Disk
                </div>
                <MetricBar pct={vps.diskPercent ?? 0} />
                {vps.diskUsedGb != null && (
                  <p className="text-[11px] text-slate-600 font-mono">{vps.diskUsedGb?.toFixed(1)} / {vps.diskTotalGb?.toFixed(1)} GB</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-5 w-5 text-cyan-400 animate-spin" />
              <span className="ml-3 text-sm text-slate-400">Loading VPS data…</span>
            </div>
          )}
          {vps?.timestamp && (
            <p className="text-[11px] text-slate-600 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last snapshot: {new Date(vps.timestamp).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Services Tab */}
      {tab === 'services' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">Service status is derived from VPS and API health checks.</p>
          {[
            { name: 'Next.js / Node', ok: !vps?.error, detail: vps?.error ? 'Cannot reach VPS' : 'Running' },
            { name: 'Nginx (proxy)', ok: null, detail: 'Not monitored directly' },
            { name: 'Redis / Queue', ok: jobs?.queue?.backendAvailable ?? null, detail: jobs?.queue?.healthy ? 'Healthy' : 'Unavailable' },
            { name: 'Database', ok: !vps?.error, detail: vps?.error ? 'Cannot confirm' : 'Responding' },
          ].map(svc => (
            <div key={svc.name} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-white">{svc.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">{svc.detail}</span>
                <StatusBadge ok={svc.ok} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Providers Tab */}
      {tab === 'providers' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-cyan-400" />
              <span className="text-sm text-white">GenX AI Gateway</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">
                {genx == null ? 'Checking…' : genx.available ? `${genx.modelCount ?? 0} models` : genx.configured ? 'Configured but unreachable' : 'Not configured'}
              </span>
              <StatusBadge ok={genx?.available ?? null} label={genx?.available ? 'Online' : genx?.configured ? 'Unreachable' : 'Not set'} />
            </div>
          </div>
          {genx?.error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">
              {genx.error}
            </div>
          )}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-xs text-slate-500">
            Provider error rates and latency tracking — coming soon. Configure provider keys in{' '}
            <a href="/admin/dashboard/settings" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">Settings</a>.
          </div>
        </div>
      )}

      {/* Jobs Tab */}
      {tab === 'jobs' && (
        <div className="space-y-3">
          {jobs ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Queue Status', value: jobs.queue?.healthy ? 'Healthy' : 'Unavailable', ok: jobs.queue?.healthy ?? false },
                  { label: 'Batch Processing', value: `${jobs.batch?.processing ?? 0} running / ${jobs.batch?.failed ?? 0} failed`, ok: (jobs.batch?.failed ?? 0) === 0 },
                  { label: 'Video Jobs', value: `${jobs.video?.processing ?? 0} running / ${jobs.video?.failed ?? 0} failed`, ok: (jobs.video?.failed ?? 0) === 0 },
                ].map(card => (
                  <div key={card.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">{card.label}</p>
                    <p className="text-sm font-medium text-white">{card.value}</p>
                    <div className="mt-2"><StatusBadge ok={card.ok} /></div>
                  </div>
                ))}
              </div>
              <a href="/admin/dashboard/artifacts" className="block text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                View all artifacts &amp; jobs →
              </a>
            </>
          ) : (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center text-sm text-slate-500">
              {loading ? 'Loading job data…' : 'Job queue data unavailable'}
            </div>
          )}
        </div>
      )}

      {/* Apps Tab */}
      {tab === 'apps' && (
        <div className="space-y-3">
          {apps.length === 0 ? (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center text-sm text-slate-500">
              {loading ? 'Loading app health…' : 'No apps registered yet. Create an app in Apps & Agents.'}
            </div>
          ) : (
            apps.map(app => (
              <div key={app.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{app.name}</p>
                  <p className="text-[11px] text-slate-500">{app.slug}</p>
                </div>
                <div className="flex items-center gap-3">
                  {app.integration?.lastHeartbeatAt && (
                    <span className="text-[11px] text-slate-600 hidden sm:block">
                      Last seen {new Date(app.integration.lastHeartbeatAt).toLocaleString()}
                    </span>
                  )}
                  <StatusBadge
                    ok={app.integration?.healthStatus === 'ok' || app.status === 'active'}
                    label={app.integration?.healthStatus ?? app.status}
                  />
                </div>
              </div>
            ))
          )}
          {apps.length > 0 && (
            <Link href="/admin/dashboard/apps" className="block text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
              Manage all apps →
            </Link>
          )}
        </div>
      )}

      {/* MCP / Tools Tab */}
      {tab === 'mcp' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-3">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              <h2 className="text-sm font-semibold">Internal Tool Registry</h2>
            </div>
            <p className="text-xs text-slate-400">
              Core tools are checked through <code className="font-mono text-slate-300">/api/admin/tool-registry</code>. External MCP server connections are post-launch and separate from the wired internal dashboard tools.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white">Tool availability</h3>
            <ul className="space-y-2 text-xs text-slate-400">
              {[
                { label: 'Tool registry', status: 'requires-config' },
                { label: 'Per-app allowed tools', status: 'requires-config' },
                { label: 'Per-agent allowed tools', status: 'requires-config' },
                { label: 'Confirmation for destructive tools', status: 'requires-config' },
                { label: 'Tool call logs', status: 'requires-config' },
                { label: 'Budget / cost tracking per model call', status: 'partial' },
                { label: 'GitHub tools (create PR, push, commit)', status: 'partial' },
                { label: 'Repo tools (clone, tree, diff, patch)', status: 'partial' },
                { label: 'Webhook registry', status: 'requires-config' },
                { label: 'MCP server connections', status: 'requires-config' },
                { label: 'Media tools (image gen, video gen, TTS)', status: 'partial' },
                { label: 'Crawler tools (Firecrawl, Crawl4AI)', status: 'partial' },
                { label: 'VPS tools (server health, restart)', status: 'partial' },
              ].map(item => (
                <li key={item.label} className="flex items-center justify-between">
                  <span>{item.label}</span>
                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full ${
                    item.status === 'partial'
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'bg-red-500/10 text-red-400'
                  }`}>
                    {item.status === 'partial' ? 'partial' : 'requires config'}
                  </span>
                </li>
              ))}
            </ul>
            {tools?.tools?.length ? (
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {tools.tools.map((tool) => (
                  <div key={tool.id} className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-200">{tool.label}</span>
                      <span className={tool.enabled ? 'text-emerald-300' : 'text-amber-300'}>
                        {tool.enabled ? 'enabled' : 'blocked'}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">{tool.endpoint ?? tool.category}</p>
                    {tool.lastError && <p className="mt-2 text-[11px] text-amber-200">{tool.lastError}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-amber-200">Live tool registry data unavailable.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
