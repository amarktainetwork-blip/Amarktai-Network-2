/**
 * Human Approval Engine API — AmarktAI Network
 *
 * Manages approval requests for sensitive/costly/high-risk actions.
 * Uses SystemAlert as backing store with alertType = 'approval_request'.
 * Falls back to local VPS JSON store if DB is unavailable.
 * GET: list pending/resolved approvals
 * POST: create approval request or resolve one
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  appendRecord,
  listRecords,
  updateRecord,
  findRecord,
  LOCAL_STORE_FILES,
} from '@/lib/local-json-store'
import { listExecutions, resolveExecutionApproval } from '@/lib/execution'

interface LocalApproval {
  id: string
  type: string
  title: string
  description: string
  app: string
  agent: string
  risk: string
  requestedBy: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  decidedAt?: string
  decisionNote?: string
  auditLog: Array<{ action: string; by: string; at: string; note?: string }>
}

function dbApprovalToShape(a: {
  id: number | string
  title: string
  message: string | null
  appSlug: string | null
  resolved: boolean
  severity: string
  metadata: string | null
  createdAt: Date
  resolvedAt: Date | null
}) {
  let meta: Record<string, unknown> = {}
  try { meta = JSON.parse(a.metadata ?? '{}') } catch { /* ignore */ }
  return {
    id: String(a.id),
    type: (meta.type as string) ?? 'general',
    title: a.title,
    description: a.message ?? '',
    app: a.appSlug ?? 'general',
    agent: (meta.agent as string) ?? '',
    risk: a.severity,
    requestedBy: (meta.requestedBy as string) ?? 'admin',
    status: a.resolved ? ('approved' as const) : ('pending' as const),
    createdAt: a.createdAt.toISOString(),
    decidedAt: a.resolvedAt?.toISOString() ?? undefined,
    decisionNote: undefined as string | undefined,
    auditLog: [],
    resource: a.appSlug ?? 'general',
    severity: a.severity,
    metadata: meta,
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const statusFilter = searchParams.get('status') ?? 'pending'
  const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 100)

  // Try DB first
  try {
    const approvals = await prisma.systemAlert.findMany({
      where: {
        alertType: 'approval_request',
        ...(statusFilter === 'pending' ? { resolved: false } : statusFilter === 'resolved' ? { resolved: true } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    const mapped = approvals.map(dbApprovalToShape)
    // Merge with any local approvals not in DB
    const localApprovals = listRecords<LocalApproval>(LOCAL_STORE_FILES.approvals)
    const localFiltered = localApprovals.filter(
      (a) => statusFilter === 'all' || a.status === statusFilter || (statusFilter === 'pending' && a.status === 'pending'),
    )
    return NextResponse.json({
      approvals: [...mapped, ...localFiltered],
      executions: listExecutions({ approvalStatus: statusFilter === 'pending' ? 'pending' : undefined }),
      total: mapped.length + localFiltered.length,
      driver: 'db+local',
    })
  } catch {
    // Fall through to local
  }

  // Local VPS fallback
  const approvals = listRecords<LocalApproval>(LOCAL_STORE_FILES.approvals)
  const filtered = approvals.filter(
    (a) => statusFilter === 'all' || a.status === statusFilter || (statusFilter === 'pending' && a.status === 'pending'),
  ).slice(0, limit)

  return NextResponse.json({
    approvals: filtered,
    executions: listExecutions({ approvalStatus: statusFilter === 'pending' ? 'pending' : undefined }),
    total: filtered.length,
    driver: 'local_vps',
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'create') {
      const { title, description, type, app, agent, risk, requestedBy, category, resource, severity: sev } = body
      if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

      // Try DB first
      try {
        const approval = await prisma.systemAlert.create({
          data: {
            alertType: 'approval_request',
            severity: sev ?? risk ?? 'warning',
            title,
            message: description ?? '',
            appSlug: resource ?? app ?? category ?? null,
            metadata: JSON.stringify({
              type: type ?? category ?? 'general',
              agent: agent ?? '',
              requestedBy: requestedBy ?? 'admin',
              category: category ?? 'general',
              requestedAt: new Date().toISOString(),
            }),
          },
        })
        return NextResponse.json({ approval: { id: String(approval.id), title: approval.title, status: 'pending' }, driver: 'db' })
      } catch {
        // Fall through to local
      }

      // Local VPS fallback
      const now = new Date().toISOString()
      const localApproval: Omit<LocalApproval, 'id'> = {
        type: type ?? category ?? 'general',
        title,
        description: description ?? '',
        app: resource ?? app ?? category ?? 'general',
        agent: agent ?? '',
        risk: sev ?? risk ?? 'warning',
        requestedBy: requestedBy ?? 'admin',
        status: 'pending',
        createdAt: now,
        auditLog: [{ action: 'created', by: requestedBy ?? 'admin', at: now }],
      }
      const saved = appendRecord(LOCAL_STORE_FILES.approvals, localApproval)
      return NextResponse.json({ approval: { id: saved.id, title: saved.title, status: 'pending' }, driver: 'local_vps' })
    }

    if (action === 'resolve') {
      const { id, decision } = body
      if (!id) return NextResponse.json({ error: 'Approval ID is required' }, { status: 400 })

      // Try DB first (numeric IDs)
      const numericId = Number(id)
      if (!isNaN(numericId)) {
        try {
          await prisma.systemAlert.update({
            where: { id: numericId },
            data: {
              resolved: true,
              resolvedAt: new Date(),
              message: `${decision === 'approved' ? 'Approved' : 'Rejected'} by admin`,
            },
          })
          return NextResponse.json({ success: true, decision, driver: 'db' })
        } catch {
          // Fall through to local
        }
      }

      // Local VPS fallback
      const existing = findRecord<LocalApproval>(LOCAL_STORE_FILES.approvals, id)
      if (!existing) return NextResponse.json({ error: 'Approval not found' }, { status: 404 })
      const now = new Date().toISOString()
      updateRecord<LocalApproval>(LOCAL_STORE_FILES.approvals, id, {
        status: decision === 'approved' ? 'approved' : 'rejected',
        decidedAt: now,
        auditLog: [
          ...existing.auditLog,
          { action: decision === 'approved' ? 'approved' : 'rejected', by: 'admin', at: now },
        ],
      })
      resolveExecutionApproval(id, decision === 'approved' ? 'approved' : 'rejected')
      return NextResponse.json({ success: true, decision, driver: 'local_vps' })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to process approval' }, { status: 500 })
  }
}
