/**
 * GET /api/admin/analytics?appSlug=&campaignId=
 * Returns aggregated campaign analytics.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { aggregateCampaignAnalytics } from '@/lib/publishing-scheduler'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const appSlug = req.nextUrl.searchParams.get('appSlug') ?? 'dashboard'
  const campaignId = req.nextUrl.searchParams.get('campaignId')

  try {
    if (campaignId) {
      const summary = await aggregateCampaignAnalytics(campaignId, appSlug)
      return NextResponse.json({ summary, campaignId, appSlug })
    }

    // List recent analytics rows
    const rows = await prisma.campaignAnalytics.findMany({
      where: { appSlug },
      orderBy: { capturedAt: 'desc' },
      take: 100,
    })
    return NextResponse.json({ analytics: rows, appSlug })
  } catch (e) {
    return NextResponse.json({ analytics: [], error: e instanceof Error ? e.message : 'Failed' })
  }
}
