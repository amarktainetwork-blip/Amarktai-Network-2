'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, Clock, ShieldCheck, XCircle } from 'lucide-react'

interface ApprovalAction {
  id: string
  label: string
  category: string
  risk: string
  defaultAllowed: boolean
  requiresConfirmation: boolean
  requiresAdmin: boolean
  description: string
}

type StatusLabel = 'Working' | 'Ready to wire' | 'Needs key' | 'Backend pending'

function StatusBadge({ status }: { status: StatusLabel }) {
  const styles: Record<StatusLabel, string> = {
    Working: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Ready to wire': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    'Needs key': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Backend pending': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  }
  const icons: Record<StatusLabel, React.ReactNode> = {
    Working: <CheckCircle className="h-3 w-3" />,
    'Ready to wire': <Clock className="h-3 w-3" />,
    'Needs key': <XCircle className="h-3 w-3" />,
    'Backend pending': <Clock className="h-3 w-3" />,
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles[status]}`}>
      {icons[status]} {status}
    </span>
  )
}

const ACTION_CATEGORIES: Array<{
  id: string
  label: string
  description: string
  status: StatusLabel
  items: string[]
}> = [
  {
    id: 'pr',
    label: 'PR Approval',
    description: 'Pull request creation and merge approvals. All PR and merge actions are approval-gated, audited, and logged.',
    status: 'Ready to wire',
    items: ['PR creation approval', 'PR merge approval', 'Branch protection override'],
  },
  {
    id: 'deploy',
    label: 'Deploy Approval',
    description: 'Deployment to VPS/production. Requires checks passing and explicit admin approval before executing.',
    status: 'Ready to wire',
    items: ['Staging deploy approval', 'Production deploy approval', 'VPS/service restart approval', 'Rollback approval'],
  },
  {
    id: 'adult',
    label: 'Adult Access Changes',
    description: 'Changes to adult content settings at app level. Requires approval, audit, and age gate configuration.',
    status: 'Backend pending',
    items: ['Enable adult mode for app', 'Change adult capability level', 'Age gate configuration'],
  },
  {
    id: 'spend',
    label: 'Spend / Provider Cost Approval',
    description: 'Actions that incur significant provider costs. Gated by spend limits and admin approval.',
    status: 'Backend pending',
    items: ['High-cost model runs', 'Batch processing jobs', 'Bulk media generation'],
  },
  {
    id: 'destructive',
    label: 'Destructive Action Approval',
    description: 'Irreversible operations such as data deletion, workspace reset, and schema migrations.',
    status: 'Ready to wire',
    items: ['Workspace delete', 'Database schema migration', 'File/repo reset', 'Memory data purge'],
  },
  {
    id: 'marketing',
    label: 'Marketing Send Approval',
    description: 'Mass communication approvals — email sequences, push notifications, social posts.',
    status: 'Backend pending',
    items: ['Email campaign send', 'Push notification blast', 'Social post schedule'],
  },
]

export default function ActionsPage() {
  const [actions, setActions] = useState<ApprovalAction[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/aiva/actions')
      .then((res) => res.json())
      .then((data) => {
        if (data.success === false) throw new Error(data.error ?? 'Failed to load action permissions')
        setActions(data.actions ?? [])
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load action permissions'))
  }, [])

  const grouped = actions.reduce<Record<string, ApprovalAction[]>>((acc, action) => {
    acc[action.category] ??= []
    acc[action.category].push(action)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-fuchsia-500 shadow-lg shadow-violet-950/30">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white">Actions</h1>
          <p className="text-xs text-slate-400">Approval queue — all write, spend, deploy, and destructive actions are gated here</p>
        </div>
        <div className="ml-auto">
          <StatusBadge status="Ready to wire" />
        </div>
      </div>

      {/* Policy notice */}
      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
        <p className="text-xs font-semibold text-cyan-300">Approval policy</p>
        <p className="mt-1 text-xs text-slate-400">
          AmarktAI Assistant can read and propose freely, but all writes, spend, deploys, PRs, marketing sends, adult-mode changes, and destructive actions require explicit confirmation.
          Everything is approval-gated, audited, and logged.
        </p>
      </div>

      {/* Live queue placeholder */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <p className="text-sm font-bold text-white">Live Approval Queue</p>
          <StatusBadge status="Backend pending" />
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
          <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-slate-600" />
          <p className="text-sm text-slate-500">No pending approvals.</p>
          <p className="mt-1 text-xs text-slate-600">Approval queue backend not wired — will show pending actions when wired.</p>
        </div>
      </div>

      {/* Action category cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        {ACTION_CATEGORIES.map((cat) => (
          <div key={cat.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-violet-400" />
                <p className="text-sm font-bold text-white">{cat.label}</p>
              </div>
              <StatusBadge status={cat.status} />
            </div>
            <p className="mb-3 text-xs text-slate-400">{cat.description}</p>
            <div className="space-y-1.5">
              {cat.items.map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
                  <Clock className="h-3 w-3 shrink-0 text-slate-600" />
                  <span className="text-xs text-slate-400">{item}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Dynamic actions from backend */}
      {error && <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-200">{error}</div>}

      {Object.keys(grouped).length > 0 && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-white">Live Action Permissions</p>
          <div className="grid gap-4 lg:grid-cols-2">
            {Object.entries(grouped).map(([category, items]) => (
              <section key={category} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <h2 className="mb-3 text-sm font-bold capitalize text-white">{category}</h2>
                <div className="space-y-2">
                  {items.map((action) => (
                    <div key={action.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{action.label}</p>
                          <p className="mt-1 text-xs text-slate-500">{action.description}</p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-400">{action.risk}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                        <Pill ok={action.defaultAllowed} label={action.defaultAllowed ? 'Default allowed' : 'Manual only'} />
                        <Pill ok={!action.requiresConfirmation} label={action.requiresConfirmation ? 'Confirmation required' : 'No confirmation'} />
                        <Pill ok={action.requiresAdmin} label={action.requiresAdmin ? 'Admin only' : 'User allowed'} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Pill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 ${ok ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100' : 'border-amber-400/20 bg-amber-400/10 text-amber-100'}`}>
      <ShieldCheck className="h-3 w-3" />{label}
    </span>
  )
}
