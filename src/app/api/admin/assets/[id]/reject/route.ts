/**
 * POST /api/admin/assets/[id]/reject
 * Rejects a generated asset, preserving version history.
 * Rejected assets are blocked from publishing.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { rejectAssetWithVersionPreservation } from '@/lib/campaign-storage'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => ({})) as { notes?: string }
  const notes = body.notes?.trim() ?? ''

  if (!notes) return NextResponse.json({ error: 'Rejection notes are required' }, { status: 400 })

  try {
    const { asset } = await rejectAssetWithVersionPreservation(id, notes)
    return NextResponse.json({ asset })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Rejection failed' }, { status: 500 })
  }
}
