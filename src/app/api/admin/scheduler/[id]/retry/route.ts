/**
 * POST /api/admin/scheduler/[id]/retry
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const updated = await prisma.publishingSchedule.update({
      where: { id },
      data: { status: 'retrying', error: null, nextRetryAt: new Date() },
    })
    return NextResponse.json({ ok: true, status: updated.status })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}
