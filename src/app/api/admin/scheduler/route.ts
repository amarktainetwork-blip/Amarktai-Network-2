/**
 * GET  /api/admin/scheduler?appSlug=  — list schedules
 * POST /api/admin/scheduler           — create schedule
 *
 * Publishing stays blocked_approval_required when asset/item not approved.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createSchedule, type CreateScheduleInput, type SupportedPlatform } from '@/lib/publishing-scheduler'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const appSlug = req.nextUrl.searchParams.get('appSlug') ?? 'dashboard'
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? '50'), 100)

  try {
    const rows = await prisma.publishingSchedule.findMany({
      where: { appSlug },
      orderBy: { scheduledFor: 'desc' },
      take: limit,
    })
    const schedules = rows.map(r => ({
      id: r.id,
      appSlug: r.appSlug,
      campaignId: r.campaignId,
      campaignItemId: r.campaignItemId,
      assetId: r.assetId,
      platform: r.platform,
      scheduledFor: r.scheduledFor.toISOString(),
      timezone: r.timezone,
      status: r.status,
      blockReason: r.blockReason,
      attemptCount: r.attemptCount,
      maxAttempts: r.maxAttempts,
      lastAttemptAt: r.lastAttemptAt?.toISOString() ?? null,
      nextRetryAt: r.nextRetryAt?.toISOString() ?? null,
      error: r.error,
      createdAt: r.createdAt.toISOString(),
    }))
    return NextResponse.json({ schedules })
  } catch (e) {
    return NextResponse.json({ schedules: [], error: e instanceof Error ? e.message : 'Failed' })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const appSlug = (body.appSlug as string) ?? 'dashboard'
  const scheduledFor = body.scheduledFor as string | undefined
  if (!scheduledFor) return NextResponse.json({ error: 'scheduledFor is required' }, { status: 400 })

  const input: CreateScheduleInput = {
    appSlug,
    workspaceId: body.workspaceId as string | undefined,
    campaignId: body.campaignId as string | undefined,
    campaignItemId: body.campaignItemId as string | undefined,
    assetId: body.assetId as string | undefined,
    platform: (body.platform as SupportedPlatform) ?? 'generic_export',
    scheduledFor: new Date(scheduledFor),
    timezone: (body.timezone as string) ?? 'UTC',
    maxAttempts: typeof body.maxAttempts === 'number' ? body.maxAttempts : 3,
    metadata: body.metadata as Record<string, unknown> | undefined,
  }

  try {
    const schedule = await createSchedule(input)
    return NextResponse.json({ schedule })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}
