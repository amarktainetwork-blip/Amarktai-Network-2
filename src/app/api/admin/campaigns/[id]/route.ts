/**
 * GET /api/admin/campaigns/[id]
 * Get campaign with items and assets.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getCampaign, listAssetsByCampaign } from '@/lib/campaign-storage'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const campaign = await getCampaign(id)
    if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const [items, assets] = await Promise.all([
      prisma.campaignItem.findMany({ where: { campaignId: id }, orderBy: { createdAt: 'asc' } }),
      listAssetsByCampaign(id),
    ])

    return NextResponse.json({
      campaign,
      items: items.map(i => ({
        id: i.id,
        platform: i.platform,
        contentType: i.contentType,
        title: i.title,
        caption: i.caption,
        status: i.status,
        approvalStatus: i.approvalStatus,
        approvalNotes: i.approvalNotes,
      })),
      assets: assets.map(a => ({
        id: a.id,
        assetType: a.assetType,
        capability: a.capability,
        status: a.status,
        approvalStatus: a.approvalStatus,
        approvalNotes: a.approvalNotes,
        promptSummary: a.promptSummary,
        resultUrl: a.resultUrl,
        createdAt: a.createdAt.toISOString(),
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
