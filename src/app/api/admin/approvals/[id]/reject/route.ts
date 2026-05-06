/**
 * POST /api/admin/approvals/[id]/reject
 *
 * Reject a pending action in the approval queue.
 * Records the decision in the audit log (SystemAlert or local store).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { findRecord, updateRecord, LOCAL_STORE_FILES } from '@/lib/local-json-store'

interface LocalApproval {
  id: string
  title: string
  status: 'pending' | 'approved' | 'rejected'
  decidedAt?: string
  decisionNote?: string
  auditLog: Array<{ action: string; by: string; at: string; note?: string }>
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession()
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Approval ID is required' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({})) as { reason?: string }
    const reason = body.reason ?? ''

    // Try DB first (numeric IDs)
    const numericId = Number(id)
    if (!isNaN(numericId)) {
      try {
        const existing = await prisma.systemAlert.findUnique({ where: { id: numericId } })
        if (existing) {
          if (existing.resolved) {
            return NextResponse.json({ error: 'Approval already resolved' }, { status: 409 })
          }
          const updated = await prisma.systemAlert.update({
            where: { id: numericId },
            data: {
              resolved: true,
              resolvedAt: new Date(),
              message: `Rejected by admin${reason ? `: ${reason}` : ''}`,
            },
          })
          return NextResponse.json({
            success: true,
            decision: 'rejected',
            id: String(updated.id),
            resolvedAt: updated.resolvedAt,
            driver: 'db',
          })
        }
      } catch {
        // Fall through to local store
      }
    }

    // Local VPS fallback
    const existing = findRecord<LocalApproval>(LOCAL_STORE_FILES.approvals, id)
    if (!existing) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 })
    }
    if (existing.status !== 'pending') {
      return NextResponse.json({ error: 'Approval already resolved' }, { status: 409 })
    }
    const now = new Date().toISOString()
    const updated = updateRecord<LocalApproval>(LOCAL_STORE_FILES.approvals, id, {
      status: 'rejected',
      decidedAt: now,
      decisionNote: reason || undefined,
      auditLog: [
        ...existing.auditLog,
        { action: 'rejected', by: 'admin', at: now, note: reason || undefined },
      ],
    })

    return NextResponse.json({
      success: true,
      decision: 'rejected',
      id,
      resolvedAt: now,
      driver: 'local_vps',
      approval: updated,
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to reject' }, { status: 500 })
  }
}
