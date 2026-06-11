import { NextRequest, NextResponse } from 'next/server'
import { executeCapability } from '@/lib/capability-router'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as {
    prompt?: string
    model?: string
    modelOverride?: string
    providerOverride?: string
  } | null

  if (!body?.prompt?.trim()) {
    return NextResponse.json({ error: 'prompt is required and must be a non-empty string' }, { status: 400 })
  }

  const result = await executeCapability({
    input: body.prompt.trim(),
    capability: 'image_generation',
    providerOverride: body.providerOverride,
    modelOverride: body.modelOverride ?? body.model,
  })

  return NextResponse.json(
    {
      executed: result.success,
      imageUrl: result.output?.startsWith('http') ? result.output : undefined,
      imageBase64: result.output?.startsWith('data:image/') ? result.output : undefined,
      jobId: result.jobId,
      status: result.status,
      provider: result.provider,
      model: result.model,
      error: result.error,
      code: result.success ? undefined : 'no_eligible_image_model',
      capability: 'image_generation',
    },
    { status: result.success ? 200 : 503 },
  )
}
