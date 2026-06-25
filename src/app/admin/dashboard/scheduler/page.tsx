'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Calendar, Loader2, Plus, RefreshCw, X } from 'lucide-react'
import { EmptyState, ErrorState, LoadingState, PageHeader, SectionCard, StatusBadge } from '@/components/dashboard/ui'

type ScheduleStatus = 'draft' | 'scheduled' | 'ready' | 'blocked_approval_required' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'retrying'

interface Schedule {
  id: string
  campaignId: string | null
  campaignItemId: string | null
  assetId: string | null
  platform: string
  scheduledFor: string
  timezone: string
  status: ScheduleStatus
  blockReason: string | null
  attemptCount: number
  maxAttempts: number
  lastAttemptAt: string | null
  nextRetryAt: string | null
  error: string | null
  createdAt: string
}

const STATUS_LABEL: Record<ScheduleStatus, string> = {
  draft: 'draft',
  scheduled: 'scheduled',
  ready: 'ready',
  blocked_approval_required: 'approval required',
  processing: 'processing',
  completed: 'completed',
  failed: 'failed',
  cancelled: 'cancelled',
  retrying: 'retrying',
}

const PLATFORMS = ['instagram', 'tiktok', 'youtube_shorts', 'facebook', 'linkedin', 'x', 'pinterest', 'generic_export']

export default function SchedulerPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const [form, setForm] = useState({
    platform: 'generic_export',
    scheduledFor: new Date(Date.now() + 3600_000).toISOString().slice(0, 16),
    timezone: 'UTC',
    campaignId: '',
    campaignItemId: '',
    assetId: '',
  })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/admin/scheduler?appSlug=dashboard', { cache: 'no-store' })
      const data = await res.json() as { schedules?: Schedule[]; error?: string }
      setSchedules(data.schedules ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load schedules')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function createSchedule() {
    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/admin/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appSlug: 'dashboard',
          platform: form.platform,
          scheduledFor: new Date(form.scheduledFor).toISOString(),
          timezone: form.timezone,
          campaignId: form.campaignId || undefined,
          campaignItemId: form.campaignItemId || undefined,
          assetId: form.assetId || undefined,
        }),
      })
      const data = await res.json() as { schedule?: Schedule; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed to create schedule')
      setShowForm(false)
      await load()
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setCreating(false)
    }
  }

  async function cancel(id: string) {
    setBusy(id)
    try {
      await fetch(`/api/admin/scheduler/${id}/cancel`, { method: 'POST' })
      await load()
    } finally {
      setBusy(null)
    }
  }

  async function retry(id: string) {
    setBusy(id)
    try {
      await fetch(`/api/admin/scheduler/${id}/retry`, { method: 'POST' })
      await load()
    } finally {
      setBusy(null)
    }
  }

  const getStatusColor = (s: ScheduleStatus) => {
    if (s === 'completed') return 'healthy'
    if (s === 'blocked_approval_required' || s === 'failed') return 'critical'
    if (s === 'processing' || s === 'retrying') return 'warning'
    if (s === 'cancelled') return 'unknown'
    return 'pending'
  }

  return (
    <div className="space-y-5">
      <PageHeader
        label="Scheduler"
        title="Publishing Scheduler"
        description="Schedule posts for publishing. Publishing is blocked when approval is required and not granted."
        badge={
          <div className="flex items-center gap-2">
            <button onClick={load} className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
            <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-black text-cyan-300 hover:bg-cyan-500/15">
              <Plus className="h-3.5 w-3.5" /> Schedule
            </button>
          </div>
        }
      />

      {/* Approval gate notice */}
      <div className="rounded-xl border border-amber-400/20 bg-amber-400/8 px-4 py-3">
        <p className="text-xs font-bold text-amber-300">Publishing gate: items with status <code className="rounded bg-amber-900/30 px-1">blocked_approval_required</code> will not publish until approved in the Approvals page.</p>
      </div>

      {/* Create form */}
      {showForm && (
        <SectionCard title="Create Schedule">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Platform">
                <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} className="field">
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </FormField>
              <FormField label="Scheduled For">
                <input type="datetime-local" value={form.scheduledFor} onChange={e => setForm(f => ({ ...f, scheduledFor: e.target.value }))} className="field" />
              </FormField>
              <FormField label="Timezone">
                <input type="text" value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))} className="field" placeholder="UTC" />
              </FormField>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField label="Campaign ID (optional)">
                <input type="text" value={form.campaignId} onChange={e => setForm(f => ({ ...f, campaignId: e.target.value }))} className="field" placeholder="cmp_…" />
              </FormField>
              <FormField label="Item ID (optional)">
                <input type="text" value={form.campaignItemId} onChange={e => setForm(f => ({ ...f, campaignItemId: e.target.value }))} className="field" placeholder="item_…" />
              </FormField>
              <FormField label="Asset ID (optional)">
                <input type="text" value={form.assetId} onChange={e => setForm(f => ({ ...f, assetId: e.target.value }))} className="field" placeholder="ast_…" />
              </FormField>
            </div>
            {createError && <p className="text-xs text-red-300">{createError}</p>}
            <div className="flex gap-2">
              <button onClick={createSchedule} disabled={creating} className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                {creating ? 'Creating…' : 'Create Schedule'}
              </button>
              <button onClick={() => setShowForm(false)} className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-400">
                <X className="h-4 w-4" /> Cancel
              </button>
            </div>
          </div>
        </SectionCard>
      )}

      {loading && <LoadingState label="Loading schedules…" />}
      {!loading && error && <ErrorState message={error} retry={load} />}

      {!loading && !error && (
        <SectionCard title={`Schedules (${schedules.length})`}>
          {schedules.length === 0 ? (
            <EmptyState
              icon={<Calendar className="h-10 w-10" />}
              title="No schedules yet"
              description="Create a schedule to publish approved campaign items."
              action={<button onClick={() => setShowForm(true)} className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-black text-cyan-300">Create Schedule</button>}
            />
          ) : (
            <div className="space-y-2">
              {schedules.map(s => (
                <div key={s.id} className="rounded-xl border border-slate-700/40 bg-slate-950/45 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={getStatusColor(s.status)} label={STATUS_LABEL[s.status] ?? s.status} />
                        <span className="rounded-md border border-slate-600 bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">{s.platform}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{new Date(s.scheduledFor).toLocaleString()} {s.timezone}</p>
                      {s.blockReason && (
                        <div className="mt-1 flex items-start gap-1.5">
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
                          <p className="text-xs text-amber-300">{s.blockReason}</p>
                        </div>
                      )}
                      {s.error && <p className="mt-1 text-xs text-red-300">{s.error}</p>}
                      <p className="mt-0.5 text-[10px] text-slate-600">
                        Attempts: {s.attemptCount}/{s.maxAttempts}
                        {s.nextRetryAt ? ` · Next retry: ${new Date(s.nextRetryAt).toLocaleString()}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {(s.status === 'failed' || s.status === 'cancelled') && (
                        <button onClick={() => retry(s.id)} disabled={busy === s.id} className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/15 disabled:opacity-50">
                          {busy === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Retry'}
                        </button>
                      )}
                      {!['completed', 'cancelled', 'failed'].includes(s.status) && (
                        <button onClick={() => cancel(s.id)} disabled={busy === s.id} className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/15 disabled:opacity-50">
                          {busy === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Cancel'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      <style jsx>{`
        .field { width: 100%; background: rgba(15,23,42,0.6); border: 1px solid rgba(51,65,85,0.6); border-radius: 0.625rem; color: #e2e8f0; font-size: 0.875rem; padding: 0.5rem 0.75rem; outline: none; }
        .field:focus { border-color: rgba(34,211,238,0.4); }
        .field option { background: #0f172a; }
      `}</style>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</label>
      {children}
    </div>
  )
}
