import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as {
    prompt?: string
    image?: string
    providerOverride?: string
    modelOverride?: string
    appSlug?: string
    executionId?: string
  } | null

  if (!body?.prompt?.trim() || !body.image) {
    return NextResponse.json({ error: 'prompt and image are required' }, { status: 400 })
  }

  return NextResponse.json({
    success: false,
    executed: false,
    capability: 'image_edit',
    readiness: 'UNAVAILABLE',
    provider: body.providerOverride ?? null,
    model: body.modelOverride ?? null,
    jobStatus: 'unavailable',
    artifactId: null,
    error: 'Image editing requires a provider adapter that transmits the source image. No approved source-image adapter is wired yet.',
  }, { status: 501 })
}
