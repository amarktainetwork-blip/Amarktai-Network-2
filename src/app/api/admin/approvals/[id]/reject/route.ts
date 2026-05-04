/**
 * POST /api/admin/approvals/[id]/reject
 *
 * Reject a pending action in the approval queue.
 * Records the decision in the audit log (SystemAlert).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

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
    const numericId = Number(id)

    if (!id || isNaN(numericId)) {
      return NextResponse.json({ error: 'Valid approval ID is required' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({})) as { reason?: string }
    const reason = body.reason ?? ''

    const existing = await prisma.systemAlert.findUnique({ where: { id: numericId } })
    if (!existing) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 })
    }
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
      id: updated.id,
      resolvedAt: updated.resolvedAt,
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to reject' }, { status: 500 })
  }
}
