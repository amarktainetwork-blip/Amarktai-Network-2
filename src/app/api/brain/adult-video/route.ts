import { NextRequest, NextResponse } from 'next/server'
import { executeCapability } from '@/lib/capability-router'
import { getAppSafetyConfig, loadAppSafetyConfigFromDB, scanContent } from '@/lib/content-filter'
import {
  getAdultAppCapabilityProfile,
  validateAdultCapabilityRequest,
} from '@/lib/adult-app-capabilities'
import { requestedVideoDuration, shouldUseLongFormVideo } from '@/lib/video-route-specs'
import { createLongFormVideoProject } from '@/lib/long-form-video'

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
  if (body.providerOverride?.trim() || body.modelOverride?.trim()) {
    return NextResponse.json({
      error: 'Apps request capabilities only. Provider and model forcing is not allowed on this route.',
    }, { status: 400 })
  }
  const duration = requestedVideoDuration(body.prompt)
  const longForm = shouldUseLongFormVideo({ prompt: body.prompt, duration })
  const adultProfile = await getAdultAppCapabilityProfile(body.appSlug)
  const adultPolicy = validateAdultCapabilityRequest(
    adultProfile,
    longForm ? 'adult_long_video' : 'adult_short_video',
    body.prompt,
  )
  if (!adultPolicy.allowed) {
    return NextResponse.json(
      { capability: 'adult_video', executed: false, error: adultPolicy.blocker },
      { status: 403 },
    )
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
  if (longForm) {
    const project = await createLongFormVideoProject({
      appSlug: body.appSlug,
      prompt: body.prompt.trim(),
      totalDuration: duration,
      capability: 'adult_video',
      idempotencyKey: `${body.appSlug}:adult_video:${body.prompt}:${duration}`,
    })
    return NextResponse.json({
      success: project.status !== 'blocked',
      capability: 'adult_video',
      route: 'long_form_video',
      project,
      pollUrl: `/api/admin/video-projects?id=${project.id}`,
    }, { status: 202 })
  }
  const result = await executeCapability({
    input: body.prompt.trim(),
    capability: 'adult_video',
    appId: body.appSlug,
    adultMode: true,
    safeMode: false,
  })
  return NextResponse.json(result, { status: result.success ? 200 : 503 })
}
