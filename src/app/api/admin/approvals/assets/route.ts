/**
 * GET /api/admin/approvals/assets
 * Returns generated assets and campaign items pending approval.
 * Shape matches ApprovalTarget from dashboard-api.ts.
 */

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [assets, items] = await Promise.all([
      prisma.generatedAsset.findMany({
        where: { approvalStatus: { in: ['draft', 'pending_review', 'rejected', 'needs_changes'] } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.campaignItem.findMany({
        where: { approvalStatus: { in: ['draft', 'pending_review', 'rejected', 'needs_changes'] } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ])

    const approvals = [
      ...assets.map(a => ({
        id: a.id,
        type: 'asset' as const,
        title: a.promptSummary || a.assetType,
        approvalStatus: a.approvalStatus,
        assetType: a.assetType,
        resultUrl: a.resultUrl,
        approvalNotes: a.approvalNotes,
        campaignId: a.campaignId ?? undefined,
        updatedAt: a.updatedAt.toISOString(),
      })),
      ...items.map(i => ({
        id: i.id,
        type: 'campaign_item' as const,
        title: i.title || i.platform,
        approvalStatus: i.approvalStatus,
        platform: i.platform,
        resultUrl: null as string | null,
        approvalNotes: i.approvalNotes,
        campaignId: i.campaignId,
        updatedAt: i.updatedAt.toISOString(),
      })),
    ]

    return NextResponse.json({ approvals })
  } catch {
    return NextResponse.json({ approvals: [] })
  }
}
