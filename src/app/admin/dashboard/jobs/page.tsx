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
import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers3,
  Loader2,
  RefreshCw,
  XCircle,
  Zap,
} from 'lucide-react'

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

  const load = async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/admin/system/jobs')
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

  useEffect(() => { load() }, [])

  const cancel = async (id: string) => {
    await fetch(`/api/admin/system/jobs/${id}/cancel`, { method: 'POST' })
    await load()
  }

  const runningCount = jobs.filter((j) => ['running', 'processing', 'queued', 'planned', 'generating_scenes', 'stitching', 'saving_artifact'].includes(j.status?.toLowerCase())).length
  const completedCount = jobs.filter((j) => j.status?.toLowerCase() === 'completed').length
  const failedCount = jobs.filter((j) => j.status?.toLowerCase() === 'failed').length

  return (
    <div className="space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-400">Jobs</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white lg:text-3xl">
            Job Tracker
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Track running and recent AI execution jobs.
          </p>
        </div>
        <button
          onClick={load}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-800/60 px-4 py-2 text-xs font-bold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Summary cards ──────────────────────────────────────────────────── */}
      {!loading && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2 rounded-2xl border border-teal-800/40 bg-teal-900/10 p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-teal-400" />
              <p className="text-xs font-black uppercase tracking-wide text-teal-400">Running</p>
            </div>
            <p className="text-2xl font-black text-teal-300">{runningCount}</p>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-emerald-800/40 bg-emerald-900/10 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <p className="text-xs font-black uppercase tracking-wide text-emerald-400">Completed</p>
            </div>
            <p className="text-2xl font-black text-emerald-300">{completedCount}</p>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-red-800/40 bg-red-900/10 p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-400" />
              <p className="text-xs font-black uppercase tracking-wide text-red-400">Failed</p>
            </div>
            <p className="text-2xl font-black text-red-300">{failedCount}</p>
          </div>
        </div>
      )}

      {/* ── Job list ───────────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
          Recent Jobs {jobs.length > 0 && `(${jobs.length})`}
        </h2>

        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
            <p className="text-sm text-slate-500">Loading jobs…</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-8 text-center">
            <Clock className="mx-auto h-8 w-8 text-slate-600" />
            <p className="mt-3 font-bold text-slate-400">No jobs yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Jobs appear here when you run capabilities from Studio or Command Center.
            </p>
            <Link
              href="/admin/dashboard/studio"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-teal-400"
            >
              Open Studio
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => {
              const statusCfg = getStatusConfig(job.status)
              const StatusIcon = statusCfg.icon
              const isRunning = ['running', 'processing'].includes(job.status?.toLowerCase())
              const safeError = sanitizeError(job.error)

              return (
                <div
                  key={job.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-800/60 bg-slate-900/40 p-4 sm:flex-row sm:items-center"
                >
                  {/* Status indicator */}
                  <div className="flex items-center gap-3 sm:w-32 sm:shrink-0">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${statusCfg.dot} ${isRunning ? 'animate-pulse' : ''}`} />
                    <div className="flex items-center gap-1.5">
                      <StatusIcon className={`h-3.5 w-3.5 ${statusCfg.color} ${isRunning ? 'animate-spin' : ''}`} />
                      <span className={`text-xs font-bold ${statusCfg.color}`}>{statusCfg.label}</span>
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
                    {job.promptSummary && <p className="mt-1 truncate text-xs text-slate-400">{job.promptSummary}</p>}
                    {job.providerAttempts && job.providerAttempts.length > 0 && (
                      <p className="mt-1 text-[11px] text-slate-500">
                        Attempts: {job.providerAttempts.map((attempt) => `${attempt.provider ?? 'provider'} ${attempt.status ?? ''}`.trim()).join(' -> ')}
                      </p>
                    )}
                    {job.providerJobIds && job.providerJobIds.length > 0 && (
                      <p className="mt-1 text-[11px] text-slate-500">
                        Provider jobs: {job.providerJobIds.join(', ')}
                      </p>
                    )}
                    {job.charged && (
                      <p className="mt-1 text-[11px] font-bold text-amber-300">Provider charge recorded</p>
                    )}
                    {typeof job.progress === 'number' && job.status !== 'completed' && (
                      <p className="mt-1 text-[11px] text-slate-500">Progress: {job.progress}%</p>
                    )}
                    <p className="mt-1 font-mono text-[11px] text-slate-500">{job.id}</p>
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
                      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-1.5 text-xs font-bold text-teal-300 transition hover:bg-teal-500/20"
                    >
                      <Layers3 className="h-3.5 w-3.5" />
                      View artifact
                    </a>
                  )}
                  {['queued', 'processing'].includes(job.status?.toLowerCase()) && !job.cancelRequested && (
                    <button
                      onClick={() => cancel(job.id)}
                      className="shrink-0 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-300 transition hover:bg-red-500/20"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Quick links ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/dashboard/studio"
          className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-black text-slate-950 transition hover:bg-teal-400"
        >
          Create in Studio
        </Link>
        <Link
          href="/admin/dashboard/artifacts"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-800/60 px-5 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-slate-800"
        >
          View artifacts
        </Link>
      </div>

    </div>
  )
}
