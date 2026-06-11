import { NextRequest, NextResponse } from 'next/server'
import { executeCapability } from '@/lib/capability-router'
import { getAppSafetyConfig, loadAppSafetyConfigFromDB, validateSuggestivePrompt } from '@/lib/content-filter'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as {
    prompt?: string
    appSlug?: string
    providerOverride?: string
    modelOverride?: string
  } | null

  if (!body?.prompt?.trim()) {
    return NextResponse.json({ error: 'prompt is required and must be a non-empty string' }, { status: 400 })
  }

  if (body.appSlug) {
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
    providerOverride: body.providerOverride,
    modelOverride: body.modelOverride,
    safeMode: false,
  })

  return NextResponse.json(
    {
      capability: 'suggestive_image_generation',
      executed: result.success,
      imageUrl: result.output?.startsWith('http') ? result.output : undefined,
      imageBase64: result.output?.startsWith('data:image/') ? result.output : undefined,
      provider: result.provider,
      model: result.model,
      promptUsed: prompt,
      promptRewritten: prompt !== body.prompt.trim(),
      error: result.error,
    },
    { status: result.success ? 200 : 503 },
  )
}
