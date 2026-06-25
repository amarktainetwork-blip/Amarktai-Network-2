/**
 * POST /api/admin/assets/[id]/approve
 * Approves a generated asset. Publishing is only unblocked after approval.
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

  try {
    const asset = await getGeneratedAsset(id)
    if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 })

    const updated = await updateAssetApproval(id, 'approved', body.notes ?? '')
    return NextResponse.json({ asset: updated })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Approval failed' }, { status: 500 })
  }
}
