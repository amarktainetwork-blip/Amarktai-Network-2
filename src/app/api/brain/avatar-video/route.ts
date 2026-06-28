import { NextRequest, NextResponse } from 'next/server'
import { persistCanonicalMediaResult } from '@/lib/canonical-media-artifact'
import { callGenXMedia, GENX_IMAGE_MODELS } from '@/lib/genx-client'
import { createLocalMediaJob, localMediaJobResponse } from '@/lib/media-job-store'
import { recordAvatarLibraryEntry } from '@/lib/avatar-library-store'
import { normalizeProviderVideoDuration } from '@/lib/provider-video-policy'

function stringValue(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function numberValue(value: unknown, fallback: number) {
  const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.trim()) : NaN
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback
}

function slugValue(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'avatar'
}

function configuredAvatarVideoModel() {
  const model = process.env.GENX_AVATAR_VIDEO_MODEL
    ?? process.env.GENX_LIPSYNC_MODEL
    ?? process.env.KLING_AVATAR_MODEL
    ?? ''
  const normalized = model.trim()
  if (!normalized) return null
  if (/^veo-|generic|default-video/i.test(normalized)) return null
  return normalized
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const prompt = stringValue(body.prompt)
  if (!prompt) {
    return NextResponse.json({
      success: false,
      executed: false,
      capability: 'avatar_video',
      jobStatus: 'blocked',
      artifactId: null,
      storageUrl: null,
      error: 'prompt is required',
      blocker: 'prompt is required',
    }, { status: 400 })
  }

  const appSlug = stringValue(body.appSlug, 'amarktai-network')
  const mode = stringValue(body.mode, 'image') === 'video' ? 'video' : 'image'
  const avatarName = stringValue(body.avatarName, prompt.slice(0, 48) || 'Studio avatar')
  const style = stringValue(body.style, 'creator_avatar')
  const referenceImageUrl = stringValue(body.referenceImageUrl)
  const duration = normalizeProviderVideoDuration(numberValue(body.duration, 8))
  const library = stringValue(body.library, 'default')
  const voice = stringValue(body.voice)
  const script = stringValue(body.script, prompt)
  const avatarId = stringValue(body.avatarId, `${appSlug}:${library}:${slugValue(avatarName)}`)
  const videoModel = mode === 'video' ? configuredAvatarVideoModel() : null
  if (mode === 'video') {
    if (!referenceImageUrl) {
      const blocker = 'Avatar video requires a reusable referenceImageUrl from the avatar library or reference upload before lip-sync/video generation.'
      return NextResponse.json({
        success: false,
        executed: false,
        capability: 'avatar_video',
        provider: 'genx',
        model: null,
        jobStatus: 'blocked',
        artifactId: null,
        storageUrl: null,
        error: blocker,
        blocker,
        requiredConfig: ['referenceImageUrl'],
        avatarVideoProofEligible: false,
      }, { status: 409 })
    }
    if (!videoModel) {
      const blocker = 'No real GenX avatar/lip-sync model is configured. Set GENX_AVATAR_VIDEO_MODEL, GENX_LIPSYNC_MODEL, or KLING_AVATAR_MODEL to a reference-capable avatar/lip-sync model; generic Veo video is not accepted as avatar lip-sync proof.'
      return NextResponse.json({
        success: false,
        executed: false,
        capability: 'avatar_video',
        provider: 'genx',
        model: null,
        jobStatus: 'blocked',
        artifactId: null,
        storageUrl: null,
        error: blocker,
        blocker,
        requiredConfig: ['GENX_AVATAR_VIDEO_MODEL', 'GENX_LIPSYNC_MODEL', 'KLING_AVATAR_MODEL'],
        avatarVideoProofEligible: false,
      }, { status: 409 })
    }
  }
  const model = mode === 'video' ? videoModel! : GENX_IMAGE_MODELS[0]
  const type = mode === 'video' ? 'video' : 'image'
  const capability = mode === 'video' ? 'avatar_video' : 'avatar_image'
  const providerPrompt = [
    `Create a reusable ${mode === 'video' ? 'talking avatar video' : 'avatar image'}.`,
    `Avatar name: ${avatarName}.`,
    `Style: ${style}.`,
    `Persona: ${prompt}.`,
    `Script/speaking text: ${script}.`,
    voice ? `Voice direction: ${voice}.` : '',
    referenceImageUrl ? `Use this visual reference: ${referenceImageUrl}.` : '',
  ].filter(Boolean).join('\n')

  const generated = await callGenXMedia({
    model,
    prompt: providerPrompt,
    type,
    duration: mode === 'video' ? duration : undefined,
    params: referenceImageUrl ? { referenceImageUrl, imageUrl: referenceImageUrl, avatarId } : undefined,
    metadata: { capability, mode, avatarId, avatarName, style, referenceImageUrl, voice, referenceConditioned: mode === 'video' },
  })

  if (!generated.success || (!generated.url && !generated.jobId)) {
    const blocker = generated.error
      ? `Avatar ${mode} provider failed: ${generated.error}`
      : `Avatar ${mode} provider returned no completed media or trackable job.`
    return NextResponse.json({
      success: false,
      executed: false,
      capability,
      provider: 'genx',
      model: generated.model,
      jobStatus: 'failed',
      artifactId: null,
      storageUrl: null,
      error: blocker,
      blocker,
      providerStatusCode: generated.statusCode ?? null,
      providerErrorDetails: generated.errorDetails ?? null,
    }, { status: 502 })
  }

  const metadata = {
    capability,
    avatarName,
    avatarLibrary: library,
    style,
    mode,
    persona: prompt,
    script,
    voice,
    referenceImageUrl,
    referenceConditioned: mode === 'video',
    avatarId,
    duration,
  }

  if (generated.jobId) {
    const job = createLocalMediaJob({
      capability,
      appSlug,
      type,
      subType: mode === 'video' ? 'avatar_video' : 'avatar_image',
      title: `Avatar: ${avatarName}`,
      description: providerPrompt,
      prompt: providerPrompt,
      provider: 'genx',
      model: generated.model,
      providerJobId: generated.jobId,
      metadata,
    })
    return NextResponse.json(localMediaJobResponse(job), { status: 202 })
  }

  const persisted = await persistCanonicalMediaResult({
    result: { url: generated.url, status: generated.status },
    appSlug,
    type,
    subType: mode === 'video' ? 'avatar_video' : 'avatar_image',
    title: `Avatar: ${avatarName}`,
    description: providerPrompt,
    provider: 'genx',
    model: generated.model,
    traceId: `avatar-${Date.now()}`,
    metadata,
  })

  if (!persisted.artifactId || !persisted.storageUrl) {
    const blocker = persisted.blocker ?? 'Avatar artifact ingestion failed.'
    return NextResponse.json({
      success: false,
      executed: false,
      capability,
      provider: 'genx',
      model: generated.model,
      jobStatus: 'failed',
      artifactId: null,
      storageUrl: null,
      error: blocker,
      blocker,
    }, { status: 502 })
  }

  const avatar = recordAvatarLibraryEntry({
    avatarId,
    appSlug,
    library,
    name: avatarName,
    artifactId: persisted.artifactId,
    artifactUrl: persisted.storageUrl,
    referenceArtifactId: mode === 'image' ? persisted.artifactId : null,
    referenceImageUrl: mode === 'image' ? persisted.storageUrl : referenceImageUrl,
    identitySource: mode === 'image' ? 'generated_reference' : 'video_output',
    provider: 'genx',
    model: generated.model,
    prompt: providerPrompt,
    persona: prompt,
    metadata,
  })

  return NextResponse.json({
    success: true,
    executed: true,
    capability,
    provider: 'genx',
    model: generated.model,
    jobStatus: 'completed',
    status: 'completed',
    artifactId: persisted.artifactId,
    storageUrl: persisted.storageUrl,
    mediaUrl: persisted.mediaUrl,
    imageUrl: type === 'image' ? persisted.mediaUrl : null,
    videoUrl: type === 'video' ? persisted.mediaUrl : null,
    avatarVideoProofEligible: type === 'video' && Boolean(videoModel && referenceImageUrl),
    avatar,
    error: null,
    blocker: null,
  }, { status: 201 })
}
