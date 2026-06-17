import { NextRequest, NextResponse } from 'next/server'
import { executeCapability } from '@/lib/capability-router'
import { getAppSafetyConfig, loadAppSafetyConfigFromDB, validateSuggestivePrompt } from '@/lib/content-filter'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as {
    prompt?: string
    appSlug?: string
    providerOverride?: string
    modelOverride?: string
    executionId?: string
  } | null

  if (!body?.prompt?.trim()) {
    return NextResponse.json({ error: 'prompt is required and must be a non-empty string' }, { status: 400 })
  }
  if (body.providerOverride?.trim() || body.modelOverride?.trim()) {
    return NextResponse.json({
      error: 'Apps request capabilities only. Provider and model forcing is not allowed on this route.',
    }, { status: 400 })
  }
  if (!body.appSlug?.trim()) {
    return NextResponse.json({
      capability: 'suggestive_image_generation',
      executed: false,
      gating_required: true,
      error: 'appSlug is required for app-policy-gated suggestive generation.',
    }, { status: 400 })
  }

  await loadAppSafetyConfigFromDB(body.appSlug)
  const policy = getAppSafetyConfig(body.appSlug)
  if (policy.safeMode || !policy.suggestiveMode) {
    return NextResponse.json(
      {
        capability: 'suggestive_image_generation',
        executed: false,
        gating_required: true,
        error: 'Suggestive image generation requires safeMode=false and suggestiveMode=true for this app.',
      },
      { status: 403 },
    )
  }

  const validation = validateSuggestivePrompt(body.prompt.trim())
  if (!validation.allowed) {
    return NextResponse.json(
      {
        capability: 'suggestive_image_generation',
        executed: false,
        prompt_blocked: true,
        error: validation.reason ?? 'Prompt blocked by safety policy.',
      },
      { status: 422 },
    )
  }

  const prompt = `Tasteful professional photograph, artistic lighting, no explicit sexual content, no genitalia: ${validation.sanitized}`
  const result = await executeCapability({
    input: prompt,
    capability: 'suggestive_image',
    appId: body.appSlug,
    safeMode: false,
    saveArtifact: true,
    metadata: { executionId: body.executionId },
  })

  return NextResponse.json(
    {
      capability: 'suggestive_image_generation',
      executed: result.success,
      imageUrl: result.output?.startsWith('http') ? result.output : undefined,
      imageBase64: result.output?.startsWith('data:image/') ? result.output : undefined,
      provider: result.provider,
      model: result.model,
      artifactId: result.artifactId,
      promptUsed: prompt,
      promptRewritten: prompt !== body.prompt.trim(),
      error: result.error,
    },
    { status: result.success ? 200 : 503 },
  )
}
