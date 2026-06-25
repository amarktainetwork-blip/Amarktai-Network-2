/**
 * GET /api/admin/campaigns
 * List all campaigns from campaign-storage.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const statusFilter = req.nextUrl.searchParams.get('status')
  const limitParam = req.nextUrl.searchParams.get('limit')
  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 200) : 100

  try {
    const rows = await prisma.campaign.findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    const campaigns = rows.map(r => ({
      id: r.id,
      name: r.name,
      goal: r.goal,
      status: r.status,
      approvalMode: r.approvalMode,
      platforms: safeParseJson(r.platforms, [] as string[]),
      contentTypes: safeParseJson(r.contentTypes ?? '[]', [] as string[]),
      budgetTier: r.budgetTier,
      qualityTier: r.qualityTier,
      durationDays: r.durationDays,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }))
    return NextResponse.json(campaigns)
  } catch {
    return NextResponse.json([])
  }
}

function safeParseJson<T>(v: string, fallback: T): T {
  try { return JSON.parse(v) as T } catch { return fallback }
}
