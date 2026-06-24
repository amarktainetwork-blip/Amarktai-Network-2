/**
 * Jobs / Operations page — user-friendly job tracker.
 *
 * Shows:
 * - Running and recent jobs
 * - Job status in plain language
 * - Result/artifact links
 * - Safe error reasons
 *
 * No stack traces. No backend debug clutter. No raw env dumps.
 */

'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers3,
  Loader2,
  XCircle,
} from 'lucide-react'
import {
  DashboardEmptyState,
  DashboardMetricCard,
  DashboardPageHeader,
  DashboardSectionPanel,
  DashboardStatusBadge,
} from '@/components/dashboard/DashboardChrome'

// ── Types ─────────────────────────────────────────────────────────────────────

type Job = {
  id: string
  type?: string
  status: string
  capability?: string
  provider?: string
  model?: string
  createdAt?: string
  completedAt?: string
  error?: string | null
  artifactId?: string
  finalArtifactId?: string | null
  appSlug?: string
  artifactUrl?: string | null
  promptSummary?: string
  providerAttempts?: Array<{ provider?: string; model?: string; status?: string; error?: string }>
  providerJobIds?: string[]
  pollUrls?: string[]
  charged?: boolean
  progress?: number
  cancelRequested?: boolean
}

// ── Status config ─────────────────────────────────────────────────────────────

const JOB_STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; dot: string }> = {
  completed: { label: 'Completed', icon: CheckCircle2, color: 'text-emerald-400', dot: 'bg-emerald-400' },
  running: { label: 'Running', icon: Loader2, color: 'text-teal-400', dot: 'bg-teal-400' },
  processing: { label: 'Processing', icon: Loader2, color: 'text-teal-400', dot: 'bg-teal-400' },
  generating_scenes: { label: 'Generating scenes', icon: Loader2, color: 'text-teal-400', dot: 'bg-teal-400' },
  stitching: { label: 'Stitching', icon: Loader2, color: 'text-cyan-400', dot: 'bg-cyan-400' },
  saving_artifact: { label: 'Saving artifact', icon: Loader2, color: 'text-cyan-400', dot: 'bg-cyan-400' },
  planned: { label: 'Planned', icon: Clock, color: 'text-cyan-400', dot: 'bg-cyan-400' },
  queued: { label: 'Queued', icon: Clock, color: 'text-cyan-400', dot: 'bg-cyan-400' },
  pending: { label: 'Pending', icon: Clock, color: 'text-slate-400', dot: 'bg-slate-400' },
  failed: { label: 'Failed', icon: XCircle, color: 'text-red-400', dot: 'bg-red-400' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-slate-500', dot: 'bg-slate-500' },
}

function getStatusConfig(status: string) {
  return JOB_STATUS_CONFIG[status.toLowerCase()] ?? {
    label: status,
    icon: Clock,
    color: 'text-slate-400',
    dot: 'bg-slate-400',
  }
}

function formatTime(iso?: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return '—'
  }
}

function sanitizeError(error?: string | null): string | null {
  if (!error) return null
  return error
    .replace(/(?:mysql|mariadb):\/\/[^\s"']+/gi, '[redacted]')
    .replace(/\b(?:password|secret|token|api[-_]?key)=\S+/gi, '[redacted]')
    .slice(0, 200)
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'active' | 'completed' | 'failed' | 'archived' | 'all'>('active')

  const load = async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/admin/jobs')
      const data = await res.json()
      // Accept various response shapes
      const jobList = Array.isArray(data.jobs) ? data.jobs : []
      setJobs(Array.isArray(jobList) ? jobList.slice(0, 50) : [])
    } catch {
      setJobs([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), 5000)
    return () => window.clearInterval(timer)
  }, [])

  const cancel = async (id: string) => {
    await fetch(`/api/admin/system/jobs/${id}/cancel`, { method: 'POST' })
    await load()
  }

  const runningCount = jobs.filter((j) => ['running', 'processing', 'queued', 'planned', 'generating_scenes', 'stitching', 'saving_artifact'].includes(j.status?.toLowerCase())).length
  const completedCount = jobs.filter((j) => j.status?.toLowerCase() === 'completed').length
  const failedCount = jobs.filter((j) => j.status?.toLowerCase() === 'failed').length
  const visibleJobs = useMemo(() => jobs.filter((job) => {
    const status = job.status?.toLowerCase()
    if (filter === 'all') return true
    if (filter === 'active') return ['running', 'processing', 'queued', 'planned', 'pending', 'generating_scenes', 'stitching', 'saving_artifact'].includes(status)
    if (filter === 'archived') return ['archived', 'cancelled'].includes(status)
    return status === filter
  }), [filter, jobs])

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        eyebrow="Jobs"
        title="Operational job tracker"
        description="Canonical job, execution, and control-plane visibility for queued, running, completed, failed, and artifact-linked work."
        actions={<p className="rounded-full border border-slate-700/60 bg-slate-900/50 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{refreshing ? 'Updating…' : 'Auto refresh: 5s'}</p>}
      />

      {!loading && (
        <div className="grid gap-4 sm:grid-cols-3">
          <DashboardMetricCard label="Active" value={runningCount} tone="cyan" detail="Running, processing, queued, and other in-flight work." />
          <DashboardMetricCard label="Completed" value={completedCount} tone="emerald" detail="Jobs that finished and may now link to artifacts or final outputs." />
          <DashboardMetricCard label="Failed" value={failedCount} tone="rose" detail="Jobs that ended unsuccessfully with a safe operator-visible error reason." />
        </div>
      )}

      <DashboardSectionPanel
        title={`Recent jobs${visibleJobs.length > 0 ? ` (${visibleJobs.length})` : ''}`}
        eyebrow="Canonical /api/admin/jobs surface"
        actions={
          <div className="flex flex-wrap gap-2">
            {(['active', 'completed', 'failed', 'archived', 'all'] as const).map((value) => (
              <button key={value} onClick={() => setFilter(value)} className={`rounded-full border px-3 py-1 text-xs font-bold capitalize ${filter === value ? 'border-teal-400/50 bg-teal-400/10 text-teal-200' : 'border-slate-700 text-slate-500'}`}>
                {value}
              </button>
            ))}
          </div>
        }
      >
        {loading ? (
          <DashboardEmptyState title="Loading jobs" detail="Reading canonical jobs, executions, and control-plane entries." />
        ) : visibleJobs.length === 0 ? (
          <DashboardEmptyState
            title="No jobs yet"
            detail="Jobs appear here when you run capabilities from Studio or Command Center. Pending work will stay pending, not completed."
            actions={
              <Link
                href="/admin/dashboard/studio"
                className="inline-flex items-center gap-2 rounded-full bg-cyan-300 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-950"
              >
                Open Studio
              </Link>
            }
          />
        ) : (
          <div className="space-y-2">
            {visibleJobs.map((job) => {
              const statusCfg = getStatusConfig(job.status)
              const StatusIcon = statusCfg.icon
              const isRunning = ['running', 'processing'].includes(job.status?.toLowerCase())
              const safeError = sanitizeError(job.error)

              return (
                <div
                  key={job.id}
                  className="flex flex-col gap-4 rounded-[1.35rem] border border-slate-800/70 bg-slate-950/45 p-4 transition hover:border-cyan-400/16 hover:bg-cyan-400/[0.03] xl:flex-row xl:items-center"
                >
                  {/* Status indicator */}
                  <div className="flex items-center gap-3 xl:w-40 xl:shrink-0">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${statusCfg.dot} ${isRunning ? 'animate-pulse' : ''}`} />
                    <div className="flex items-center gap-1.5">
                      <StatusIcon className={`h-3.5 w-3.5 ${statusCfg.color} ${isRunning ? 'animate-spin' : ''}`} />
                      <DashboardStatusBadge value={statusCfg.label} map={{
                        Completed: { label: 'Completed', className: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-200' },
                        Running: { label: 'Running', className: 'border-cyan-500/30 bg-cyan-500/12 text-cyan-200' },
                        Processing: { label: 'Processing', className: 'border-cyan-500/30 bg-cyan-500/12 text-cyan-200' },
                        Planned: { label: 'Planned', className: 'border-cyan-500/30 bg-cyan-500/12 text-cyan-200' },
                        Queued: { label: 'Queued', className: 'border-cyan-500/30 bg-cyan-500/12 text-cyan-200' },
                        Pending: { label: 'Pending', className: 'border-slate-700/60 bg-slate-800/60 text-slate-300' },
                        Failed: { label: 'Failed', className: 'border-rose-500/30 bg-rose-500/12 text-rose-200' },
                        Cancelled: { label: 'Cancelled', className: 'border-slate-700/60 bg-slate-800/60 text-slate-300' },
                        'Generating scenes': { label: 'Generating scenes', className: 'border-cyan-500/30 bg-cyan-500/12 text-cyan-200' },
                        Stitching: { label: 'Stitching', className: 'border-cyan-500/30 bg-cyan-500/12 text-cyan-200' },
                        'Saving artifact': { label: 'Saving artifact', className: 'border-cyan-500/30 bg-cyan-500/12 text-cyan-200' },
                      }} />
                    </div>
                  </div>

                  {/* Job details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {job.capability && (
                        <span className="rounded-full border border-teal-500/20 bg-teal-500/8 px-2 py-0.5 text-[10px] font-bold text-teal-400">
                          {job.capability}
                        </span>
                      )}
                      {job.appSlug && (
                        <span className="rounded-full border border-violet-500/20 bg-violet-500/8 px-2 py-0.5 text-[10px] font-bold text-violet-400">
                          {job.appSlug}
                        </span>
                      )}
                      {job.provider && (
                        <span className="text-[10px] font-bold text-slate-500">
                          {job.provider}{job.model ? ` / ${job.model}` : ''}
                        </span>
                      )}
                    </div>
                    {job.promptSummary && <p className="mt-2 truncate text-sm text-slate-400">{job.promptSummary}</p>}
                    {((job.providerAttempts?.length ?? 0) > 0 || (job.providerJobIds?.length ?? 0) > 0) && (
                      <details className="mt-3 rounded-xl border border-slate-800/70 bg-slate-900/55 p-3 text-[11px] text-slate-500">
                        <summary className="cursor-pointer">Provider attempt details</summary>
                        {job.providerAttempts?.map((attempt, index) => (
                          <p key={index} className="mt-1">
                            {attempt.provider ?? 'provider'} / {attempt.model ?? 'automatic'}: {attempt.status ?? 'unknown'}
                            {attempt.error ? ` - ${sanitizeError(attempt.error)}` : ''}
                          </p>
                        ))}
                        {job.providerJobIds?.map((id) => <p key={id} className="mt-1 font-mono">Provider job: {id}</p>)}
                      </details>
                    )}
                    {job.charged && (
                      <p className="mt-1 text-[11px] font-bold text-amber-300">Provider charge recorded</p>
                    )}
                    {typeof job.progress === 'number' && job.status !== 'completed' && (
                      <p className="mt-1 text-[11px] text-slate-500">Progress: {job.progress}%</p>
                    )}
                    <p className="mt-2 font-mono text-[11px] text-slate-500">{job.id}</p>
                    <p className="text-[11px] text-slate-600">{formatTime(job.createdAt)}</p>

                    {safeError && (
                      <div className="mt-2 flex items-start gap-1.5">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-red-400" />
                        <p className="text-[11px] leading-4 text-red-300/80">{safeError}</p>
                      </div>
                    )}
                  </div>

                  {/* Artifact link */}
                  {job.artifactId && (
                    <a
                      href={job.artifactUrl || '/admin/dashboard/artifacts'}
                      className="flex shrink-0 items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-300 transition hover:bg-cyan-500/18"
                    >
                      <Layers3 className="h-3.5 w-3.5" />
                      View artifact
                    </a>
                  )}
                  {['queued', 'processing'].includes(job.status?.toLowerCase()) && !job.cancelRequested && (
                    <button
                      onClick={() => cancel(job.id)}
                      className="shrink-0 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/20"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </DashboardSectionPanel>

      {/* ── Quick links ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/dashboard/studio"
          className="inline-flex items-center gap-2 rounded-full bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200"
        >
          Create in Studio
        </Link>
        <Link
          href="/admin/dashboard/artifacts"
          className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/55 px-5 py-3 text-sm font-bold text-slate-300 transition hover:bg-slate-800"
        >
          View artifacts
        </Link>
      </div>

    </div>
  )
}
