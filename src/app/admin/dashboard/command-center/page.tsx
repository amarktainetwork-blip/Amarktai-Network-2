'use client'

import { useEffect, useState } from 'react'
import { Terminal, Activity, Cpu, GitBranch, AppWindow, Zap } from 'lucide-react'

interface StatusItem {
  label: string
  status: 'ready' | 'checking' | 'blocked' | 'error'
  detail?: string
}

const QUICK_ACTIONS = [
  'Check all apps',
  'Show VPS health',
  'Show today\'s budget',
  'Open repo task',
  'Generate media',
  'Audit a repo',
]

export default function CommandCenterPage() {
  const [task, setTask] = useState('')
  const [statuses, setStatuses] = useState<StatusItem[]>([
    { label: 'GenX AI Gateway', status: 'checking' },
    { label: 'GitHub Connection', status: 'checking' },
    { label: 'Apps Online', status: 'checking' },
    { label: 'Agents Ready', status: 'checking' },
  ])

  useEffect(() => {
    async function loadStatuses() {
      const [genxRes, githubRes, appsRes] = await Promise.allSettled([
        fetch('/api/admin/genx/status'),
        fetch('/api/admin/repo-workbench/github/status'),
        fetch('/api/admin/apps'),
      ])

      setStatuses(prev => {
        const next = [...prev]

        // GenX
        if (genxRes.status === 'fulfilled' && genxRes.value.ok) {
          genxRes.value.json().then((d: { available?: boolean; configured?: boolean }) => {
            setStatuses(s => s.map(x => x.label === 'GenX AI Gateway'
              ? { ...x, status: d.available ? 'ready' : d.configured ? 'blocked' : 'blocked', detail: d.available ? 'Connected' : 'Key not configured' }
              : x))
          }).catch(() => {})
        } else {
          next[0] = { ...next[0], status: 'error', detail: 'Request failed' }
        }

        // GitHub
        if (githubRes.status === 'fulfilled' && githubRes.value.ok) {
          githubRes.value.json().then((d: { connected?: boolean }) => {
            setStatuses(s => s.map(x => x.label === 'GitHub Connection'
              ? { ...x, status: d.connected ? 'ready' : 'blocked', detail: d.connected ? 'Connected' : 'Token not set' }
              : x))
          }).catch(() => {})
        } else {
          next[1] = { ...next[1], status: 'error', detail: 'Request failed' }
        }

        // Apps
        if (appsRes.status === 'fulfilled' && appsRes.value.ok) {
          appsRes.value.json().then((d: { products?: unknown[] }) => {
            const count = d.products?.length ?? 0
            setStatuses(s => s.map(x => x.label === 'Apps Online'
              ? { ...x, status: count > 0 ? 'ready' : 'blocked', detail: `${count} app${count !== 1 ? 's' : ''}` }
              : x))
          }).catch(() => {})
        } else {
          next[2] = { ...next[2], status: 'error', detail: 'Request failed' }
        }

        // Agents — derived from apps for now
        setStatuses(s => s.map(x => x.label === 'Agents Ready'
          ? { ...x, status: 'blocked', detail: 'Per-app agents — coming soon' }
          : x))

        return next
      })
    }
    loadStatuses()
  }, [])

  const statusColor = (s: StatusItem['status']) => {
    if (s === 'ready') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    if (s === 'blocked') return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    if (s === 'error') return 'text-red-400 bg-red-500/10 border-red-500/20'
    return 'text-slate-400 bg-slate-500/10 border-slate-500/20'
  }

  const statusLabel = (s: StatusItem['status']) => {
    if (s === 'ready') return 'Ready'
    if (s === 'blocked') return 'Needs Setup'
    if (s === 'error') return 'Error'
    return 'Checking…'
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-[#0d1a2e] to-[#060d1b] p-6">
        <div className="flex items-center gap-3 mb-2">
          <Terminal className="h-6 w-6 text-cyan-400" />
          <h1 className="text-2xl font-bold text-white">Command Center</h1>
        </div>
        <p className="text-sm text-slate-400">
          Route natural language tasks to any section of the system — repos, media, agents, monitoring.
        </p>
      </div>

      {/* System Status */}
      <div>
        <h2 className="text-xs uppercase tracking-[0.14em] text-slate-500 mb-3">System Status</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statuses.map((s) => (
            <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-medium text-slate-300">{s.label}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColor(s.status)}`}>
                  {statusLabel(s.status)}
                </span>
              </div>
              {s.detail && <p className="text-[11px] text-slate-500 mt-1">{s.detail}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Task Input */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Zap className="h-4 w-4 text-cyan-400" />
          Route a Task
        </h2>
        <textarea
          value={task}
          onChange={e => setTask(e.target.value)}
          placeholder="e.g. Fix the horse app dashboard / Generate a marketing image / Show VPS health / Audit this repo…"
          rows={4}
          className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 resize-none transition-colors"
        />
        <div className="flex items-center gap-3">
          <button
            disabled
            title="AI task routing — coming soon"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-sm text-cyan-400 opacity-50 cursor-not-allowed"
          >
            <Terminal className="h-4 w-4" />
            Route Task
            <span className="text-[10px] ml-1 text-slate-500">(coming soon)</span>
          </button>
          <span className="text-xs text-slate-600">No destructive action without confirmation.</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xs uppercase tracking-[0.14em] text-slate-500 mb-3">Quick Actions</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action}
              disabled
              title="Coming soon"
              className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-slate-500 cursor-not-allowed hover:bg-white/[0.04] transition-colors text-left"
            >
              <Activity className="h-4 w-4 shrink-0 text-slate-600" />
              {action}
              <span className="ml-auto text-[10px] text-slate-700">soon</span>
            </button>
          ))}
        </div>
      </div>

      {/* Nav shortcuts */}
      <div>
        <h2 className="text-xs uppercase tracking-[0.14em] text-slate-500 mb-3">Navigate To</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: '/admin/dashboard/repo-workbench', label: 'Repo Workbench', icon: GitBranch },
            { href: '/admin/dashboard/ai-engine',      label: 'AI Engine',      icon: Cpu      },
            { href: '/admin/dashboard/apps',           label: 'Apps & Agents',  icon: AppWindow},
            { href: '/admin/dashboard/media-studio',   label: 'Media Studio',   icon: Terminal },
          ].map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <Icon className="h-4 w-4 text-cyan-400" />
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
