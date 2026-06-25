/**
 * POST /api/admin/assets/[id]/needs-changes
 * Marks a generated asset as needing changes.
 * Asset stays blocked from publishing until re-approved.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { updateAssetApproval, getGeneratedAsset } from '@/lib/campaign-storage'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => ({})) as { notes?: string }
  const notes = body.notes?.trim() ?? ''

  if (!notes) return NextResponse.json({ error: 'Notes are required for needs_changes' }, { status: 400 })

  try {
    const asset = await getGeneratedAsset(id)
    if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 })

    const updated = await updateAssetApproval(id, 'needs_changes', notes)
    return NextResponse.json({ asset: updated })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Update failed' }, { status: 500 })
  }
}
