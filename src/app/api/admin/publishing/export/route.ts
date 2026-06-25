/**
 * POST /api/admin/publishing/export
 * Build an export package for a campaign item / asset.
 * Returns export_ready status — never fakes "published".
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { checkApprovalGate, persistPublishingResult } from '@/lib/publishing-scheduler'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const appSlug = (body.appSlug as string) ?? 'dashboard'
  const campaignId = body.campaignId as string | undefined
  const campaignItemId = body.campaignItemId as string | undefined
  const assetId = body.assetId as string | undefined
  const platform = (body.platform as string) ?? 'generic_export'

  // Approval gate — publishing blocked if not approved
  const gateResult = await checkApprovalGate({ appSlug, campaignId, campaignItemId, assetId }).catch(() => ({ approved: false, reason: 'Approval check failed' }))
  if (!gateResult.approved) {
    return NextResponse.json({
      status: 'approval_required',
      blocked: true,
      reason: gateResult.reason,
    }, { status: 403 })
  }

  try {
    const exportPackageId = `export-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const result = await persistPublishingResult({
      appSlug,
      workspaceId: body.workspaceId as string | undefined,
      campaignId: campaignId,
      campaignItemId: campaignItemId,
      assetIds: assetId ? [assetId] : [],
      platform,
      status: 'export_ready',
      provider: 'none',
      exportPackageId,
      metadata: { exportedAt: new Date().toISOString() },
    })
    return NextResponse.json({ result, exportPackageId, status: 'export_ready' })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Export failed' }, { status: 500 })
  }
}
