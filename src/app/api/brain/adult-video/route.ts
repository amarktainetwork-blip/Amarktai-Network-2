import { NextRequest, NextResponse } from 'next/server'
import { executeCapability } from '@/lib/capability-router'
import { getAppSafetyConfig, loadAppSafetyConfigFromDB, scanContent } from '@/lib/content-filter'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as {
    prompt?: string
    appSlug?: string
    providerOverride?: string
    modelOverride?: string
  } | null

  if (!body?.prompt?.trim() || !body.appSlug) {
    return NextResponse.json({ error: 'prompt and appSlug are required' }, { status: 400 })
  }

  await loadAppSafetyConfigFromDB(body.appSlug)
  const policy = getAppSafetyConfig(body.appSlug)
  if (policy.safeMode || !policy.adultMode) {
    return NextResponse.json(
      {
        capability: 'adult_video',
        executed: false,
        error: 'Adult video requires explicit app-level adultMode opt-in with safeMode disabled.',
      },
      { status: 403 },
    )
  }

  const safety = scanContent(body.prompt, body.appSlug)
  if (safety.flagged) {
    return NextResponse.json(
      { capability: 'adult_video', executed: false, error: safety.message, categories: safety.categories },
      { status: 422 },
    )
  }

  const result = await executeCapability({
    input: body.prompt.trim(),
    capability: 'adult_video',
    appId: body.appSlug,
    providerOverride: body.providerOverride,
    modelOverride: body.modelOverride,
    adultMode: true,
    safeMode: false,
  })
  return NextResponse.json(result, { status: result.success ? 200 : 503 })
}
