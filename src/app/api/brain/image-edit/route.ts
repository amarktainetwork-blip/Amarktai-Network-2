import { NextRequest, NextResponse } from 'next/server'
import { executeCapability } from '@/lib/capability-router'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as {
    prompt?: string
    image?: string
    providerOverride?: string
    modelOverride?: string
  } | null

  if (!body?.prompt?.trim() || !body.image) {
    return NextResponse.json({ error: 'prompt and image are required' }, { status: 400 })
  }

  const result = await executeCapability({
    input: `${body.prompt.trim()}\nSource image: ${body.image}`,
    capability: 'image_edit',
    providerOverride: body.providerOverride,
    modelOverride: body.modelOverride,
    saveArtifact: true,
  })
  return NextResponse.json(result, { status: result.success ? 200 : 503 })
}
