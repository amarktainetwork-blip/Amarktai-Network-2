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
import { POST as videoPlanPost } from '@/app/api/brain/video/route'
import { executeCapabilityOrchestration } from '@/lib/orchestrator'
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
  projectId?: string
  brandKitId?: string
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
  const result = await executeCapabilityOrchestration({
    input: execution.input.prompt,
    capability,
    files: body.source ? [body.source] : execution.input.files,
    appId: execution.appSlug,
    providerOverride: selectedProvider,
    modelOverride: selectedModel,
    qualityTier,
    adultMode: safety.adultMode,
    suggestiveMode: safety.suggestiveMode,
    safeMode: safety.safeMode,
    saveArtifact: true,
    metadata: {
      executionId: execution.executionId,
      source: body.source,
      projectId: body.projectId,
      brandKitId: body.brandKitId,
      style: body.style,
      aspectRatio: body.aspectRatio,
      quality: body.quality,
      duration: body.duration,
      genre: normalizeGenre(body.genre),
      genres: normalizeGenres(body.genres, body.genre),
      productionNotes: normalizeGenres(body.genres, body.genre).length > 1
        ? `Blend styles: ${normalizeGenres(body.genres, body.genre).join(' + ')}`
        : undefined,
      moods: body.moods ?? [],
      vocalStyle: normalizeVocalStyle(body.vocalStyle, body.instrumental),
      instrumental: Boolean(body.instrumental),
      language: body.language,
      lyrics: body.lyrics,
      voiceId: body.voiceId,
      qualityTier,
    },
  })
  return NextResponse.json({
    ...result,
    executed: result.success,
    jobStatus: result.status ?? (result.success ? 'completed' : 'failed'),
    storageUrl: result.artifactUrl,
    mediaUrl: result.output?.startsWith('https://') ? result.output : undefined,
    providerAttempts: result.providerAttempts ?? [],
  }, {
    status: result.status === 'processing'
      ? 202
      : result.readiness === 'BLOCKED'
        ? 403
        : 200,
  })
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
    projectId: body.projectId,
    brandKitId: body.brandKitId,
    qualityTier: body.qualityTier,
  }
}

function normalizeGenre(value?: string) {
  const allowed = ['pop', 'rock', 'folk', 'hip_hop', 'edm', 'gospel', 'amapiano', 'afrobeats', 'jazz', 'classical', 'rnb', 'country', 'blues', 'reggae', 'soul', 'ambient', 'lofi', 'cinematic']
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
