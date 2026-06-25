/**
 * POST /api/admin/approvals/decide
 * Approve, reject, or request changes on an asset or campaign item.
 *
 * Publishing is blocked when approvalMode is manual_review and approval has not been granted.
 * This route enforces that approve/reject/needs_changes are the only valid decisions.
 *
 * Payload: { id, type, decision, notes }
 * No provider/model fields are accepted or used.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { updateAssetApproval, rejectAssetWithVersionPreservation, type ApprovalStatus } from '@/lib/campaign-storage'

const VALID_DECISIONS = ['approved', 'rejected', 'needs_changes'] as const

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  // Strip any provider/model override fields — they are never accepted here
  const { id, type, decision, notes } = body as {
    id?: unknown; type?: unknown; decision?: unknown; notes?: unknown
  }

  if (typeof id !== 'string' || !id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  if (!(VALID_DECISIONS as readonly string[]).includes(String(decision))) {
    return NextResponse.json({ error: `decision must be one of: ${VALID_DECISIONS.join(', ')}` }, { status: 400 })
  }

  const approvalStatus = String(decision) as ApprovalStatus
  const notesStr = typeof notes === 'string' ? notes : ''

  try {
    if (type === 'asset') {
      if (approvalStatus === 'rejected') {
        await rejectAssetWithVersionPreservation(id, notesStr || 'Rejected')
      } else {
        await updateAssetApproval(id, approvalStatus, notesStr)
      }
    } else if (type === 'campaign_item') {
      const { updateCampaignItemApproval } = await import('@/lib/campaign-storage')
      await updateCampaignItemApproval(id, approvalStatus, notesStr)
    } else {
      return NextResponse.json({ error: 'type must be asset or campaign_item' }, { status: 400 })
    }

    // If approved: check if campaign's approvalMode is manual_review, only then allow publish
    // Publishing scheduler checks approvalStatus === 'approved' before publishing — enforced in campaign-storage

    return NextResponse.json({ ok: true, id, decision: approvalStatus })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Decision failed' }, { status: 500 })
  }
}
