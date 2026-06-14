import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import {
  advanceVideoProject,
  createLongFormVideoProject,
  getVideoProject,
  listVideoProjects,
} from '@/lib/long-form-video'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({
      projects: listVideoProjects(request.nextUrl.searchParams.get('appSlug') || undefined),
    })
  }
  const existing = getVideoProject(id)
  if (!existing) return NextResponse.json({ error: 'Video project not found' }, { status: 404 })
  try {
    const project = await advanceVideoProject(id)
    return NextResponse.json({ project })
  } catch (error) {
    return NextResponse.json({
      project: getVideoProject(id),
      error: error instanceof Error ? error.message : 'Video project could not advance',
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const prompt = stringValue(body?.prompt)
  if (!prompt) return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
  try {
    const project = await createLongFormVideoProject({
      appSlug: stringValue(body?.appSlug),
      title: stringValue(body?.title),
      prompt,
      totalDuration: numberValue(body?.totalDuration),
      aspectRatio: stringValue(body?.aspectRatio),
      style: stringValue(body?.style),
      tone: stringValue(body?.tone),
      sceneCount: numberValue(body?.sceneCount),
      brandKitId: stringValue(body?.brandKitId),
      audioReference: stringValue(body?.audioReference),
      qualityTier: qualityValue(body?.qualityTier),
      requestedProvider: stringValue(body?.provider),
      requestedModel: stringValue(body?.model),
    })
    return NextResponse.json({ project }, { status: 202 })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Video project could not be created',
    }, { status: 500 })
  }
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function numberValue(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

function qualityValue(value: unknown): 'cheap' | 'balanced' | 'premium' | 'auto' | undefined {
  return ['cheap', 'balanced', 'premium', 'auto'].includes(String(value))
    ? value as 'cheap' | 'balanced' | 'premium' | 'auto'
    : undefined
}
