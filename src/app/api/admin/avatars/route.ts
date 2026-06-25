/**
 * GET  /api/admin/avatars?appSlug=  — list avatar metadata from DB
 * POST /api/admin/avatars            — create avatar record
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const appSlug = req.nextUrl.searchParams.get('appSlug') ?? 'dashboard'

  try {
    // Avatars are stored as GeneratedAssets with assetType='avatar'
    const rows = await prisma.generatedAsset.findMany({
      where: { appSlug, assetType: 'avatar' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    const avatars = rows.map(r => ({
      id: r.id,
      appSlug: r.appSlug,
      promptSummary: r.promptSummary,
      status: r.status,
      approvalStatus: r.approvalStatus,
      resultUrl: r.resultUrl,
      thumbnailUrl: r.thumbnailUrl,
      generationMode: r.generationMode,
      runtimeSelectedProvider: r.runtimeSelectedProvider,
      metadata: safeJson(r.metadata),
      createdAt: r.createdAt.toISOString(),
    }))
    return NextResponse.json({ avatars })
  } catch (e) {
    return NextResponse.json({ avatars: [], error: e instanceof Error ? e.message : 'Failed' })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const appSlug = (body.appSlug as string) ?? 'dashboard'

  try {
    const row = await prisma.generatedAsset.create({
      data: {
        appSlug,
        workspaceId: (body.workspaceId as string) ?? '',
        brandId: (body.brandId as string) ?? '',
        assetType: 'avatar',
        capability: 'avatar_generation',
        status: 'draft',
        approvalStatus: 'draft',
        runtimeSelectedProvider: '',
        runtimeSelectedModel: '',
        fallbackUsed: false,
        generationMode: (body.generationMode as string) ?? 'image',
        promptSummary: (body.promptSummary as string) ?? '',
        sourceInputs: JSON.stringify(body),
        metadata: JSON.stringify({ avatarConfig: body }),
      },
    })
    return NextResponse.json({ avatar: { id: row.id, status: row.status } })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}

function safeJson(v: string): Record<string, unknown> {
  try { return JSON.parse(v) as Record<string, unknown> } catch { return {} }
}
