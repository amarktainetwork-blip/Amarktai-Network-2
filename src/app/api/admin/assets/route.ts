/**
 * GET /api/admin/assets?campaignId=
 * List generated assets, optionally filtered by campaignId.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { listAssetsByCampaign } from '@/lib/campaign-storage'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const campaignId = req.nextUrl.searchParams.get('campaignId')
  const approvalStatus = req.nextUrl.searchParams.get('approvalStatus')
  const limitParam = req.nextUrl.searchParams.get('limit')
  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 200) : 100

  try {
    let rows
    if (campaignId) {
      const all = await listAssetsByCampaign(campaignId)
      rows = approvalStatus ? all.filter(a => a.approvalStatus === approvalStatus) : all
      rows = rows.slice(0, limit)
    } else {
      const where: Record<string, unknown> = {}
      if (approvalStatus) where.approvalStatus = approvalStatus
      rows = await prisma.generatedAsset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
    }

    const assets = rows.map((a: { id: string; assetType: string; capability: string; status: string; approvalStatus: string; approvalNotes: string; promptSummary: string; resultUrl: string | null; thumbnailUrl?: string | null; createdAt: Date | string }) => ({
      id: a.id,
      assetType: a.assetType,
      capability: a.capability,
      status: a.status,
      approvalStatus: a.approvalStatus,
      approvalNotes: a.approvalNotes,
      promptSummary: a.promptSummary,
      resultUrl: a.resultUrl ?? null,
      thumbnailUrl: (a as { thumbnailUrl?: string | null }).thumbnailUrl ?? null,
      createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : String(a.createdAt),
    }))

    return NextResponse.json(assets)
  } catch {
    return NextResponse.json([])
  }
}
