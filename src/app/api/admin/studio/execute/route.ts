import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { loadAppSafetyConfigFromDB } from '@/lib/content-filter'
import {
  createExecution,
  failExecution,
  getExecution,
  recordExecutionResponse,
  startExecution,
  updateExecution,
  type ExecutionRecord,
} from '@/lib/execution'
import {
  listMediaStudioHistory,
  mediaStudioErrorMessage,
  mediaStudioResponse,
  type MediaStudioCapability,
} from '@/lib/media-studio'
import { POST as imagePost } from '@/app/api/brain/image/route'
import { POST as imageEditPost } from '@/app/api/brain/image-edit/route'
import { POST as suggestiveImagePost } from '@/app/api/brain/suggestive-image/route'
import { POST as videoPlanPost } from '@/app/api/brain/video/route'
import { POST as videoPost } from '@/app/api/brain/video-generate/route'
import { POST as musicPost } from '@/app/api/admin/music-studio/route'
import { POST as ttsPost } from '@/app/api/brain/tts/route'
import { POST as adultImagePost } from '@/app/api/brain/adult-image/route'
import { POST as avatarVideoPost } from '@/app/api/brain/avatar-video/route'
import { executeCapability } from '@/lib/capability-router'
import {
  productCapabilityToTaxonomyId,
  resolveRoutingQuality,
  selectCapabilityRoutePlan,
  type RoutingQualityTier,
} from '@/lib/capability-routing-policy'

type StudioBody = {
  executionId?: string
  appSlug?: string
  capability?: MediaStudioCapability
  prompt?: string
  provider?: string
  model?: string
  costMode?: 'cheap' | 'balanced' | 'premium'
  qualityTier?: RoutingQualityTier
  source?: string
  artifactIds?: string[]
  style?: string
  aspectRatio?: string
  quality?: string
  duration?: number
  scenePlanOnly?: boolean
  genre?: string
  genres?: string[]
  moods?: string[]
  vocalStyle?: string
  instrumental?: boolean
  language?: string
  lyrics?: string
  voiceId?: string
}

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const executionId = request.nextUrl.searchParams.get('executionId')
  if (executionId) {
    const run = await mediaStudioResponse(executionId)
    return run
      ? NextResponse.json(run)
      : NextResponse.json({ error: 'Execution not found' }, { status: 404 })
  }
  const runs = await listMediaStudioHistory(Number(request.nextUrl.searchParams.get('limit')) || 30)
  return NextResponse.json({ runs, executions: runs.map((run) => run.execution) })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({})) as StudioBody
  const existing = body.executionId ? getExecution(body.executionId) : null
  if (body.executionId && !existing) {
    return NextResponse.json({ error: 'Execution not found' }, { status: 404 })
  }
  const prompt = (existing?.input.prompt ?? body.prompt ?? '').trim()
  const capability = (existing?.detectedCapability ?? body.capability) as MediaStudioCapability | undefined
  if (!prompt || !capability) {
    return NextResponse.json({ error: 'prompt and capability are required' }, { status: 400 })
  }

  const appSlug = existing?.appSlug ?? body.appSlug?.trim() ?? 'amarktai-network'
  const safety = await loadAppSafetyConfigFromDB(appSlug)
  const qualityTier = await resolveRoutingQuality({
    requested: body.qualityTier ?? body.costMode,
    appSlug,
    surface: 'studio',
  })
  const taxonomyId = productCapabilityToTaxonomyId(capability)
  const routePlan = taxonomyId
    ? await selectCapabilityRoutePlan({
        capability: taxonomyId,
        qualityTier,
        requestedProvider: body.provider && body.provider !== 'auto' ? body.provider as never : undefined,
        requestedModel: body.model && body.model !== 'auto' ? body.model : undefined,
      })
    : null
  const selectedProvider = routePlan?.selected?.route.provider
  const selectedModel = routePlan?.selected?.model
  let execution = existing ?? createExecution({
    appSlug,
    actor: { type: 'admin', label: 'Media Studio' },
    requestedCapability: capability,
    prompt,
    files: body.source ? [body.source] : [],
    action: 'generate',
    selectedProvider,
    selectedModel,
    costMode: qualityTier === 'auto' ? 'balanced' : qualityTier,
    adultPolicy: safety.adultMode
      ? 'full_adult_app_mode'
      : safety.suggestiveMode
        ? 'suggestive'
        : 'off',
    expensiveMedia: capability.includes('video') && Number(body.duration ?? 4) > 10,
    metadata: {
      source: 'media_studio',
      mediaSource: body.source ?? null,
      artifactIds: body.artifactIds ?? [],
      parameters: studioParameters(body),
      qualityTier,
      canonicalCapability: taxonomyId,
    },
  })
  if (['blocked', 'awaiting_approval', 'cancelled'].includes(execution.status)) {
    return NextResponse.json(
      await mediaStudioResponse(execution),
      { status: execution.status === 'awaiting_approval' ? 202 : 409 },
    )
  }
  if (existing?.approval.required && existing.approval.status !== 'approved') {
    return NextResponse.json(await mediaStudioResponse(existing), { status: 202 })
  }
  if (!['planned', 'running'].includes(execution.status)) {
    return NextResponse.json(await mediaStudioResponse(execution))
  }
  if (routePlan?.setupRequired || (routePlan && !routePlan.selected)) {
    execution = recordExecutionResponse(execution.executionId, {
      success: false,
      executed: false,
      capability,
      readiness: 'NEEDS_CONFIGURATION',
      jobStatus: 'needs_setup',
      error: routePlan.reason,
      blocker: routePlan.reason,
      qualityTier,
    }) ?? execution
    return NextResponse.json(await mediaStudioResponse(execution), { status: 503 })
  }

  execution = startExecution(execution.executionId) ?? execution
  try {
    const response = await dispatchStudio(request, body, execution, safety, qualityTier)
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>
    execution = recordExecutionResponse(execution.executionId, payload) ?? execution
    if (payload.success !== true && payload.executed !== true) {
      execution = updateExecution(execution.executionId, { result: payload }) ?? execution
    }
    const run = await mediaStudioResponse(execution)
    return NextResponse.json(run, {
      status: execution.status === 'queued' || execution.status === 'awaiting_approval'
        ? 202
        : response.ok ? 200 : response.status,
    })
  } catch (error) {
    execution = failExecution(execution.executionId, mediaStudioErrorMessage(error)) ?? execution
    return NextResponse.json(await mediaStudioResponse(execution), { status: 500 })
  }
}

async function dispatchStudio(
  original: NextRequest,
  body: StudioBody,
  execution: ExecutionRecord,
  safety: { safeMode: boolean; adultMode: boolean; suggestiveMode: boolean },
  qualityTier: 'cheap' | 'balanced' | 'premium' | 'auto',
) {
  const capability = execution.detectedCapability
  const selectedProvider = execution.providerPlan.provider ?? undefined
  const selectedModel = execution.modelPlan.model ?? undefined
  const common = {
    prompt: execution.input.prompt,
    appSlug: execution.appSlug,
    executionId: execution.executionId,
    providerOverride: selectedProvider,
    modelOverride: selectedModel,
  }
  if (capability === 'image_generation') {
    return imagePost(jsonRequest(original, '/api/brain/image', {
      ...common,
      size: imageSize(body.aspectRatio, body.quality),
      qualityTier,
    }))
  }
  if (capability === 'image_edit') {
    return imageEditPost(jsonRequest(original, '/api/brain/image-edit', {
      ...common,
      image: body.source,
    }))
  }
  if (capability === 'suggestive_image') {
    return suggestiveImagePost(jsonRequest(original, '/api/brain/suggestive-image', common))
  }
  if (capability === 'video_generation' && body.scenePlanOnly) {
    return videoPlanPost(jsonRequest(original, '/api/brain/video', {
      script: execution.input.prompt,
      appSlug: execution.appSlug,
      executionId: execution.executionId,
      style: body.style,
      duration: body.duration,
      aspectRatio: body.aspectRatio,
    }))
  }
  if (capability === 'video_generation' || capability === 'adult_video') {
    return videoPost(jsonRequest(original, '/api/brain/video-generate', {
      prompt: execution.input.prompt,
      appSlug: execution.appSlug,
      executionId: execution.executionId,
      provider: selectedProvider ?? 'auto',
      model: selectedModel,
      capability,
      style: normalizeVideoStyle(body.style),
      duration: Math.min(Math.max(Number(body.duration ?? 4), 1), 30),
      aspectRatio: normalizeAspect(body.aspectRatio),
    }))
  }
  if (capability === 'music_generation' || capability === 'lyrics_generation') {
    return musicPost(jsonRequest(original, '/api/admin/music-studio', {
      action: capability === 'lyrics_generation' ? 'lyrics_only' : 'create_async',
      request: {
        appSlug: execution.appSlug,
        executionId: execution.executionId,
        theme: execution.input.prompt,
        genre: normalizeGenre(body.genre),
        genres: normalizeGenres(body.genres, body.genre),
        moods: body.moods ?? [],
        vocalStyle: normalizeVocalStyle(body.vocalStyle, body.instrumental),
        instrumental: Boolean(body.instrumental),
        durationSeconds: Math.min(Math.max(Number(body.duration ?? 180), 15), 600),
        language: body.language ?? 'English',
        existingLyrics: body.lyrics,
        productionNotes: normalizeGenres(body.genres, body.genre).length > 1
          ? `Blend styles: ${normalizeGenres(body.genres, body.genre).join(' + ')}`
          : undefined,
        qualityTier,
        provider: selectedProvider,
        model: selectedModel,
      },
    }))
  }
  if (capability === 'tts' || capability === 'adult_voice') {
    return ttsPost(jsonRequest(original, '/api/brain/tts', {
      text: execution.input.prompt,
      appSlug: execution.appSlug,
      executionId: execution.executionId,
      provider: selectedProvider ?? 'auto',
      model: selectedModel,
      capability,
      voiceId: body.voiceId,
      language: body.language,
    }))
  }
  if (capability === 'adult_image') {
    return adultImagePost(jsonRequest(original, '/api/brain/adult-image', {
      prompt: execution.input.prompt,
      appSlug: execution.appSlug,
      executionId: execution.executionId,
      provider: selectedProvider ?? 'auto',
      model: selectedModel,
      size: imageSize(body.aspectRatio, body.quality),
    }))
  }
  if (capability === 'avatar_video') {
    return avatarVideoPost(jsonRequest(original, '/api/brain/avatar-video', {
      prompt: execution.input.prompt,
      appSlug: execution.appSlug,
      executionId: execution.executionId,
      source: body.source,
      voiceId: body.voiceId,
      provider: selectedProvider ?? 'auto',
      model: selectedModel,
    }))
  }
  if (capability === 'chat' || capability === 'code' || capability === 'file_analysis') {
    const result = await executeCapability({
      input: execution.input.prompt,
      capability,
      files: execution.input.files,
      appId: execution.appSlug,
      providerOverride: selectedProvider,
      modelOverride: selectedModel,
      saveArtifact: true,
      metadata: {
        executionId: execution.executionId,
        source: body.source,
        qualityTier,
      },
    })
    return NextResponse.json({
      ...result,
      executed: result.success,
      jobStatus: result.status ?? (result.success ? 'completed' : 'needs_setup'),
    }, { status: result.success ? 200 : result.readiness === 'NEEDS_CONFIGURATION' ? 503 : 409 })
  }
  return NextResponse.json({
    success: false,
    executed: false,
    capability,
    readiness: capability.startsWith('adult_') && !safety.adultMode ? 'BLOCKED' : 'UNAVAILABLE',
    jobStatus: 'unavailable',
    error: `${capability} is not available through the JSON Studio route.`,
  }, { status: 501 })
}

function jsonRequest(original: NextRequest, path: string, body: Record<string, unknown>) {
  return new NextRequest(new URL(path, original.url), {
    method: 'POST',
    headers: original.headers,
    body: JSON.stringify(body),
  })
}

function studioParameters(body: StudioBody) {
  return {
    style: body.style,
    aspectRatio: body.aspectRatio,
    quality: body.quality,
    duration: body.duration,
    scenePlanOnly: body.scenePlanOnly,
    genre: body.genre,
    genres: body.genres,
    moods: body.moods,
    vocalStyle: body.vocalStyle,
    instrumental: body.instrumental,
    language: body.language,
    voiceId: body.voiceId,
    qualityTier: body.qualityTier,
  }
}

function imageSize(aspect = '1:1', quality = 'standard') {
  if (aspect === '16:9') return quality === 'high' ? '1024x576' : '768x432'
  if (aspect === '9:16') return quality === 'high' ? '576x1024' : '432x768'
  return quality === 'high' ? '1024x1024' : '768x768'
}

function normalizeAspect(value?: string): '16:9' | '9:16' | '1:1' {
  return value === '9:16' || value === '1:1' ? value : '16:9'
}

function normalizeVideoStyle(value?: string): 'cinematic' | 'animated' | 'realistic' | 'documentary' | 'commercial' {
  return ['animated', 'realistic', 'documentary', 'commercial'].includes(value ?? '')
    ? value as 'animated' | 'realistic' | 'documentary' | 'commercial'
    : 'cinematic'
}

function normalizeGenre(value?: string) {
  const allowed = ['pop', 'rock', 'hip_hop', 'edm', 'gospel', 'amapiano', 'afrobeats', 'jazz', 'classical', 'rnb', 'country', 'blues', 'reggae', 'soul', 'ambient', 'lofi', 'cinematic']
  return allowed.includes(value ?? '') ? value : 'cinematic'
}

function normalizeGenres(values?: string[], fallback?: string) {
  const normalized = (values?.length ? values : [fallback])
    .map(normalizeGenre)
    .filter((value, index, all) => all.indexOf(value) === index)
  return normalized.slice(0, 5)
}

function normalizeVocalStyle(value?: string, instrumental?: boolean) {
  if (instrumental) return 'instrumental_only'
  const allowed = ['male_lead', 'female_lead', 'choir', 'rap', 'spoken_word', 'a_cappella', 'harmonized', 'falsetto']
  return allowed.includes(value ?? '') ? value : 'female_lead'
}
