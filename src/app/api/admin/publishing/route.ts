/**
 * GET /api/admin/publishing?appSlug=
 * Returns publishing results — only shows published when backend confirms real result.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const appSlug = req.nextUrl.searchParams.get('appSlug') ?? 'dashboard'

  try {
    const rows = await prisma.publishingResult.findMany({
      where: { appSlug },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    const results = rows.map(r => ({
      id: r.id,
      appSlug: r.appSlug,
      campaignId: r.campaignId,
      campaignItemId: r.campaignItemId,
      platform: r.platform,
      status: r.status,
      externalPostId: r.externalPostId,
      externalPostUrl: r.externalPostUrl,
      exportPackageId: r.exportPackageId,
      error: r.error,
      publishedAt: r.publishedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }))
    return NextResponse.json({ results })
  } catch (e) {
    return NextResponse.json({ results: [], error: e instanceof Error ? e.message : 'Failed' })
  }
}
