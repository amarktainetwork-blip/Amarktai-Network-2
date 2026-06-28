import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createArtifact, type ArtifactType } from '@/lib/artifact-store'
import { persistCanonicalMediaResult } from '@/lib/canonical-media-artifact'
import { createLocalMediaJob, localMediaJobResponse } from '@/lib/media-job-store'
import { routeLiveModel, type AiCapability } from '@/lib/live-ai-routing'
import { type AdultPolicyValue } from '@/lib/universal-model-catalog'
import { getCapabilityRuntimeTruthEntry, type CapabilityRuntimeTruthEntry } from '@/lib/capability-runtime-truth'
import { normalizeProviderMeshId, type ProviderMeshId } from '@/lib/provider-mesh'
import { recordProviderResult } from '@/lib/provider-result-log'
import { getStudioRouteConfig, type StudioTab } from '@/lib/studio-route-map'
import { POST as assistantChatPost } from '@/app/api/admin/amarktai-assistant/chat/route'
import { POST as researchAssistPost } from '@/app/api/admin/research/assist/route'
import { POST as imagePost } from '@/app/api/brain/image/route'
import { POST as videoPost } from '@/app/api/brain/video-generate/route'
import { POST as ttsPost } from '@/app/api/brain/tts/route'
import { POST as adultTextPost } from '@/app/api/brain/adult-text/route'
import { POST as adultImagePost } from '@/app/api/brain/adult-image/route'
import { POST as avatarVideoPost } from '@/app/api/brain/avatar-video/route'
import { POST as musicPost } from '@/app/api/admin/music-studio/route'

type ExecuteBody = {
  tab?: StudioTab
  prompt?: string
  provider?: unknown
  model?: unknown
  providerOverride?: unknown
  modelOverride?: unknown
  costMode?: 'cheap' | 'balanced' | 'premium'
  qualityTier?: 'basic' | 'standard' | 'high' | 'premium'
  appSlug?: string
  workspaceId?: string
  brandId?: string
  adultPolicy?: string
  mode?: 'chat' | 'text' | 'image' | 'music' | 'video' | 'voice'
  voiceId?: string
  size?: string
  style?: string
  controls?: Record<string, unknown>
}

type StudioExecutionMode = 'chat' | 'image' | 'music' | 'text' | 'video' | 'voice'
type ProofMode = 'chat' | 'image' | 'music'

const STUDIO_EXECUTABLE_PROVIDERS: Record<ProofMode, readonly ProviderMeshId[]> = {
  chat: ['genx', 'groq', 'together', 'mimo', 'huggingface'],
  image: ['genx', 'together'],
  music: ['genx'],
}

function jsonRequest(path: string, body: Record<string, unknown>) {
  return new NextRequest(new URL(path, 'http://studio.local'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return await response.json().catch(() => ({})) as Record<string, unknown>
}

async function persistArtifact(input: {
  appSlug: string
  type: ArtifactType
  subType: string
  title: string
  description?: string
  provider?: string
  model?: string
  content?: Buffer | string
  contentUrl?: string
  mimeType?: string
  metadata?: Record<string, unknown>
}) {
  try {
    return await createArtifact({
      appSlug: input.appSlug,
      type: input.type,
      subType: input.subType,
      title: input.title,
      description: input.description,
      provider: input.provider,
      model: input.model,
      content: typeof input.content === 'string' ? Buffer.from(input.content, 'utf8') : input.content,
      contentUrl: input.contentUrl,
      mimeType: input.mimeType,
      metadata: input.metadata ?? {},
    })
  } catch (error) {
    return {
      id: null,
      warning: error instanceof Error ? error.message : 'Artifact persistence failed',
    }
  }
}

function normalizeCapability(tab: StudioTab, adultMode?: string): AiCapability {
  if (tab === 'Research') return 'research'
  if (tab === 'Image') return 'image_generation'
  if (tab === 'Video') return 'video_generation'
  if (tab === 'Music / Audio') return 'music_generation'
  if (tab === 'Voice / TTS') return 'tts'
  if (tab === 'Avatar / Talking Video') return 'avatar_video'
  if (tab === 'Adult') {
    if (adultMode === 'image') return 'adult_image'
    if (adultMode === 'video') return 'adult_video'
    if (adultMode === 'voice') return 'adult_voice'
    return 'adult_text'
  }
  return 'chat'
}

function stringControl(controls: Record<string, unknown>, key: string, fallback: string) {
  const value = controls[key]
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function durationSeconds(value: string, fallback: number) {
  const trimmed = value.trim().toLowerCase()
  const minuteMatch = trimmed.match(/^(\d+)m(?:(\d+)s)?$/)
  if (minuteMatch) return (Number(minuteMatch[1]) * 60) + Number(minuteMatch[2] ?? 0)
  const secondsMatch = trimmed.match(/^(\d+)s$/)
  if (secondsMatch) return Number(secondsMatch[1])
  const numeric = Number(trimmed)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback
}

function numberControl(controls: Record<string, unknown>, key: string, fallback: number) {
  const value = controls[key]
  const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.trim()) : NaN
  return Number.isFinite(numeric) ? numeric : fallback
}

function stringArrayControl(controls: Record<string, unknown>, key: string, fallback: string[]) {
  const value = controls[key]
  if (Array.isArray(value)) {
    const entries = value.map((item) => String(item).trim()).filter(Boolean)
    return entries.length ? entries : fallback
  }
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map((item) => item.trim()).filter(Boolean)
  }
  return fallback
}

function normalizeMode(bodyMode: ExecuteBody['mode'], tab: StudioTab): StudioExecutionMode {
  if (bodyMode === 'chat' || bodyMode === 'image' || bodyMode === 'music' || bodyMode === 'text' || bodyMode === 'video' || bodyMode === 'voice') {
    return bodyMode
  }
  if (tab === 'Chat') return 'chat'
  if (tab === 'Image') return 'image'
  if (tab === 'Music / Audio') return 'music'
  if (tab === 'Video') return 'video'
  if (tab === 'Voice / TTS') return 'voice'
  return 'text'
}

function proofCapability(mode: StudioExecutionMode, capability: AiCapability) {
  if (mode === 'chat') return 'chat'
  if (mode === 'image') return 'image_generation'
  if (mode === 'music') return 'music_generation'
  return capability
}

function blockerResponse(input: {
  mode: StudioExecutionMode
  capability: string
  status: string
  blocker: string
  nextAction?: string
  proof?: Record<string, unknown> | null
  route?: unknown
}) {
  return {
    ok: false,
    success: false,
    executed: false,
    mode: input.mode,
    capability: input.capability,
    status: input.status,
    output: null,
    artifact: null,
    job: null,
    selectedProvider: null,
    selectedModel: null,
    provider: null,
    model: null,
    proof: input.proof ?? null,
    blocker: input.blocker,
    nextAction: input.nextAction ?? input.blocker,
    error: input.blocker,
    route: input.route,
  }
}

async function preflightCapability(mode: StudioExecutionMode, capability: string) {
  if (!['chat', 'image', 'music'].includes(mode)) return null
  const truth = await getCapabilityRuntimeTruthEntry(capability)
  if (!truth) {
    return {
      truth,
      response: blockerResponse({
        mode,
        capability,
        status: 'missing',
        blocker: `Capability is not registered in runtime truth: ${capability}`,
        nextAction: 'Register this capability before execution.',
      }),
      statusCode: 501,
    }
  }
  if (truth.status === 'blocked' || truth.status === 'missing') {
    return {
      truth,
      response: blockerResponse({
        mode,
        capability,
        status: truth.status,
        blocker: truth.blocker || `Capability ${capability} is ${truth.status}.`,
        nextAction: truth.nextAction,
        proof: capabilityTruthProof(truth),
      }),
      statusCode: truth.status === 'missing' ? 503 : 409,
    }
  }
  return { truth, response: null, statusCode: 200 }
}

function selectStudioProvider(mode: StudioExecutionMode, truth?: CapabilityRuntimeTruthEntry | null): ProviderMeshId | null {
  if (!truth || !['chat', 'image', 'music'].includes(mode)) return null
  const supported = STUDIO_EXECUTABLE_PROVIDERS[mode as ProofMode]
  for (const provider of truth.connectedProviderCandidates) {
    const canonical = normalizeProviderMeshId(provider)
    if (canonical && supported.includes(canonical)) return canonical
  }
  return null
}

function noConnectedStudioProviderResponse(
  mode: StudioExecutionMode,
  capability: string,
  truth?: CapabilityRuntimeTruthEntry | null,
) {
  const supported = mode === 'chat' || mode === 'image' || mode === 'music'
    ? STUDIO_EXECUTABLE_PROVIDERS[mode].join(', ')
    : ''
  return blockerResponse({
    mode,
    capability,
    status: truth?.status ?? 'blocked',
    blocker: `No connected provider supports Studio ${mode} execution through the current backend route. Supported mesh providers for this route: ${supported}.`,
    nextAction: truth?.nextAction || `Connect and test one of: ${supported}.`,
    proof: truth ? capabilityTruthProof(truth) : null,
  })
}

function canonicalProviderValue(...values: unknown[]): ProviderMeshId | null {
  for (const value of values) {
    if (typeof value !== 'string') continue
    const canonical = normalizeProviderMeshId(value)
    if (canonical) return canonical
  }
  return null
}

function capabilityTruthProof(truth: CapabilityRuntimeTruthEntry) {
  return {
    capability: truth.capabilityId,
    status: truth.status,
    proofStatus: truth.proofStatus,
    hasExecutionRoute: truth.hasExecutionRoute,
    hasStorage: truth.hasStorage,
    connectedProviderCandidates: truth.connectedProviderCandidates,
  }
}

function studioProofSnapshot(input: {
  capability: string
  provider?: unknown
  model?: unknown
  route: string
  artifactId?: unknown
  jobId?: unknown
  proofStatus: 'processing' | 'passed' | 'failed'
  error?: unknown
}) {
  return {
    capability: input.capability,
    provider: normalizeProviderMeshId(String(input.provider ?? '')) ?? 'unknown',
    model: typeof input.model === 'string' ? input.model : '',
    route: input.route,
    artifactId: typeof input.artifactId === 'string' ? input.artifactId : null,
    jobId: typeof input.jobId === 'string' ? input.jobId : null,
    timestamp: new Date().toISOString(),
    proofStatus: input.proofStatus,
    error: typeof input.error === 'string' ? input.error : null,
  }
}

async function recordStudioProof(input: {
  mode: ProofMode
  capability: string
  appSlug: string
  provider?: unknown
  model?: unknown
  success: boolean
  executed: boolean
  artifactId?: unknown
  artifactPath?: unknown
  jobId?: unknown
  routePath: string
  metadata?: Record<string, unknown>
}) {
  const canonicalProvider = normalizeProviderMeshId(String(input.provider ?? ''))
  const provider = canonicalProvider ?? 'unknown'
  const model = String(input.model ?? '')
  const proof = {
    capability: input.capability,
    provider,
    model,
    route: input.routePath,
    artifactId: typeof input.artifactId === 'string' ? input.artifactId : null,
    jobId: typeof input.jobId === 'string' ? input.jobId : null,
    timestamp: new Date().toISOString(),
    proofStatus: input.success && input.executed ? 'passed' : 'failed',
  }
  if (!canonicalProvider) return { ...proof, proofStatus: 'failed', error: 'Provider was not a canonical provider mesh ID.' }
  await recordProviderResult({
    appSlug: input.appSlug,
    provider,
    model,
    capability: input.capability,
    success: input.success,
    executed: input.executed,
    latencyMs: 0,
    contentType: input.mode === 'chat' ? 'text' : input.mode,
    artifactId: typeof input.artifactId === 'string' ? input.artifactId : undefined,
    artifactPath: typeof input.artifactPath === 'string' ? input.artifactPath : undefined,
    metadata: { ...input.metadata, proof, mode: input.mode },
  }).catch(() => null)
  return proof
}

function structuredResult(input: {
  ok: boolean
  mode: ProofMode
  capability: string
  status: string
  output?: unknown
  artifact?: unknown
  job?: unknown
  selectedProvider?: unknown
  selectedModel?: unknown
  proof?: unknown
  blocker?: unknown
  nextAction?: unknown
  extra?: Record<string, unknown>
}) {
  const selectedProvider = input.selectedProvider ?? null
  const selectedModel = input.selectedModel ?? null
  return {
    ok: input.ok,
    success: input.ok,
    executed: input.ok,
    mode: input.mode,
    capability: input.capability,
    status: input.status,
    output: input.output ?? null,
    artifact: input.artifact ?? null,
    job: input.job ?? null,
    selectedProvider,
    selectedModel,
    provider: selectedProvider,
    model: selectedModel,
    proof: input.proof ?? null,
    blocker: input.blocker ?? null,
    nextAction: input.nextAction ?? null,
    ...(input.extra ?? {}),
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as ExecuteBody
  const forbiddenFields = ['provider', 'model', 'providerOverride', 'modelOverride'] as const
  const forbidden = forbiddenFields.filter((field) => Object.prototype.hasOwnProperty.call(body, field))
  if (forbidden.length > 0) {
    return NextResponse.json({
      success: false,
      executed: false,
      error: `Studio UI payload cannot include ${forbidden.join(', ')}. Runtime routing selects these values after execution.`,
    }, { status: 400 })
  }
  const tab = body.tab
  const prompt = body.prompt?.trim() ?? ''
  const appSlug = body.appSlug?.trim() || 'amarktai-network'
  const controls = body.controls ?? {}
  if (!tab) return NextResponse.json({ success: false, error: 'tab is required' }, { status: 400 })
  if (!prompt) return NextResponse.json({ success: false, error: 'prompt is required' }, { status: 400 })

  const config = getStudioRouteConfig(tab)
  if (config.status === 'missing') {
    return NextResponse.json({
      success: false, executed: false, capability: config.capability, provider: null, model: null,
      jobStatus: 'needs_setup', artifactId: null, storageUrl: null, error: config.detail, blocker: config.detail, route: config,
    }, { status: 501 })
  }

  const capability = normalizeCapability(tab, body.mode)
  const mode = normalizeMode(body.mode, tab)
  const proofCapabilityId = proofCapability(mode, capability)
  const preflight = await preflightCapability(mode, proofCapabilityId)
  if (preflight?.response) {
    return NextResponse.json(preflight.response, { status: preflight.statusCode })
  }
  const studioProvider = selectStudioProvider(mode, preflight?.truth)
  if ((mode === 'chat' || mode === 'image' || mode === 'music') && !studioProvider) {
    return NextResponse.json(
      noConnectedStudioProviderResponse(mode, proofCapabilityId, preflight?.truth),
      { status: 409 },
    )
  }

  if (tab === 'Avatar / Talking Video') {
    const response = await avatarVideoPost(jsonRequest('/api/brain/avatar-video', { prompt, appSlug }))
    const data = await readJson(response)
    return NextResponse.json({ ...data, result: data, artifact: null }, { status: response.status })
  }

  const route = routeLiveModel({
    capability,
    appSlug,
    selectedProvider: studioProvider ?? undefined,
    selectedModel: undefined,
    costMode: body.costMode ?? 'balanced',
    adultPolicy: (body.adultPolicy ?? 'off') as AdultPolicyValue,
    requiresMedia: ['image', 'video', 'adult_image', 'adult_video', 'adult_voice', 'music_generation', 'tts'].includes(capability),
  })

  if (route.blockedReason) {
    return NextResponse.json(blockerResponse({
      mode,
      capability: proofCapabilityId,
      status: 'blocked',
      blocker: route.blockedReason,
      nextAction: 'Configure an approved provider/model route and retry.',
      route,
    }), { status: 409 })
  }

  try {
    if (mode === 'chat' || tab === 'Chat') {
      const response = await assistantChatPost(jsonRequest('/api/admin/amarktai-assistant/chat', {
        message: prompt,
        capability: 'chat',
        providerOverride: route.selectedProvider,
        modelOverride: route.selectedModel,
        costMode: body.costMode ?? 'balanced',
        metadata: {
          appSlug,
          workspaceId: body.workspaceId,
          brandId: body.brandId,
          studio: true,
        },
      }))
      const data = await readJson(response)
      const output = typeof data.output === 'string' ? data.output : null
      const responseRoute = data.route && typeof data.route === 'object'
        ? data.route as Record<string, unknown>
        : null
      const selectedProvider = canonicalProviderValue(data.provider, responseRoute?.selectedProvider, route.selectedProvider)
      const selectedModel = data.model ?? responseRoute?.selectedModel ?? route.selectedModel
      const success = response.ok && data.success !== false && Boolean(output)
      const proof = await recordStudioProof({
        mode: 'chat',
        capability: 'chat',
        appSlug,
        provider: selectedProvider,
        model: selectedModel,
        success,
        executed: success,
        routePath: '/api/admin/amarktai-assistant/chat',
        metadata: { source: 'studio_execute', noArtifact: true, truth: preflight?.truth ? capabilityTruthProof(preflight.truth) : null },
      })
      return NextResponse.json(structuredResult({
        ok: success,
        mode: 'chat',
        capability: 'chat',
        status: success ? 'completed' : 'failed',
        output,
        artifact: null,
        selectedProvider,
        selectedModel,
        proof,
        blocker: success ? null : data.error ?? 'Chat runtime returned no output.',
        nextAction: success ? null : 'Check provider configuration and retry the Studio chat request.',
        extra: { result: data, route: data.route ?? route },
      }), { status: success ? 200 : response.status })
    }

    if (tab === 'Research') {
      const response = await researchAssistPost(jsonRequest('/api/admin/research/assist', { prompt, appSlug }))
      const data = await readJson(response)
      const artifact = await persistArtifact({
        appSlug,
        type: 'document',
        subType: 'research_brief',
        title: `Research: ${prompt.slice(0, 80)}`,
        description: 'Studio Research Agent result',
        provider: String(route.selectedProvider ?? 'research'),
        model: String(route.selectedModel ?? ''),
        content: JSON.stringify(data, null, 2),
        mimeType: 'application/json',
        metadata: { tab, route },
      })
      return NextResponse.json({ success: response.ok, executed: response.ok, result: data, artifact, route }, { status: response.status })
    }

    if (tab === 'Image') {
      if (route.selectedProvider === 'huggingface') {
        return NextResponse.json({ success: false, executed: false, error: 'Hugging Face image generation is task-based and is not wired to this image execution route yet.', route }, { status: 409 })
      }
      const response = await imagePost(jsonRequest('/api/brain/image', {
        prompt,
        size: body.size ?? stringControl(controls, 'size', '1024x1024'),
        style: body.style ?? stringControl(controls, 'style', 'premium realistic'),
        providerOverride: route.selectedProvider,
        modelOverride: route.selectedModel,
      }))
      const data = await readJson(response)
      const persisted = response.ok && data.executed
        ? await persistCanonicalMediaResult({
          result: data,
          appSlug,
          type: 'image',
          subType: 'studio_image',
          title: `Image: ${prompt.slice(0, 80)}`,
          provider: String(data.provider ?? route.selectedProvider ?? ''),
          model: String(data.model ?? route.selectedModel ?? ''),
          metadata: { tab, route },
        })
        : null
      const localJob = persisted?.status === 'processing'
        && persisted.jobId
        && String(data.provider ?? route.selectedProvider) === 'genx'
        ? createLocalMediaJob({
          capability: 'image_generation',
          appSlug,
          type: 'image',
          subType: 'studio_image',
          title: `Image: ${prompt.slice(0, 80)}`,
          prompt,
          provider: String(data.provider ?? route.selectedProvider ?? ''),
          model: String(data.model ?? route.selectedModel ?? ''),
          providerJobId: persisted.jobId,
          metadata: { tab, route, responseShapeKeys: persisted.responseShapeKeys },
        })
        : null
      const tracked = localJob ? localMediaJobResponse(localJob) : null
      const completed = Boolean(persisted?.success && persisted.status === 'completed')
      const processing = Boolean(tracked)
      const success = completed || processing
      const selectedProvider = canonicalProviderValue(persisted?.provider, data.provider, route.selectedProvider)
      const selectedModel = persisted?.model ?? data.model ?? route.selectedModel
      const proof = completed
        ? await recordStudioProof({
          mode: 'image',
          capability: 'image_generation',
          appSlug,
          provider: selectedProvider,
          model: selectedModel,
          success: true,
          executed: true,
          artifactId: persisted?.artifactId ?? null,
          artifactPath: persisted?.storageUrl ?? null,
          jobId: tracked?.jobId ?? persisted?.jobId ?? null,
          routePath: '/api/brain/image',
          metadata: {
            source: 'studio_execute',
            truth: preflight?.truth ? capabilityTruthProof(preflight.truth) : null,
            responseShapeKeys: persisted?.responseShapeKeys ?? Object.keys(data).sort(),
          },
        })
        : studioProofSnapshot({
          capability: 'image_generation',
          provider: selectedProvider,
          model: selectedModel,
          route: '/api/brain/image',
          artifactId: null,
          jobId: tracked?.jobId ?? persisted?.jobId ?? null,
          proofStatus: processing ? 'processing' : 'failed',
          error: tracked ? null : persisted?.blocker ?? data.error ?? null,
        })
      const status = tracked?.jobStatus ?? persisted?.status ?? 'failed'
      return NextResponse.json(structuredResult({
        ok: success,
        mode: 'image',
        capability: 'image_generation',
        status,
        output: persisted?.mediaUrl ?? null,
        artifact: persisted?.artifact ?? null,
        job: tracked ? {
          jobId: tracked.jobId,
          providerJobId: tracked.providerJobId,
          pollUrl: tracked.pollUrl,
          status: tracked.jobStatus,
        } : null,
        selectedProvider,
        selectedModel,
        proof,
        blocker: tracked ? null : persisted?.blocker ?? data.error ?? null,
        nextAction: completed ? 'Open the artifact.' : processing ? 'Poll the job until completed.' : persisted?.blocker ?? data.error ?? 'Image provider returned no persisted artifact.',
        extra: {
          ...tracked,
          jobStatus: status,
          jobId: tracked?.jobId ?? persisted?.jobId ?? null,
          providerJobId: tracked?.providerJobId ?? persisted?.jobId ?? null,
          pollUrl: tracked?.pollUrl ?? null,
          artifactId: persisted?.artifactId ?? null,
          storageUrl: persisted?.storageUrl ?? null,
          imageUrl: persisted?.mediaUrl ?? null,
          error: tracked ? null : persisted?.blocker ?? data.error ?? null,
          responseShapeKeys: persisted?.responseShapeKeys ?? Object.keys(data).sort(),
          result: data,
          route,
        },
      }), { status: tracked ? 202 : success ? 200 : response.ok ? 502 : response.status })
    }

    if (tab === 'Video' || capability === 'adult_video') {
      const provider = route.selectedProvider === 'genx'
        ? route.selectedProvider
        : 'genx'
      const response = await videoPost(jsonRequest('/api/brain/video-generate', {
        prompt,
        style: body.style ?? stringControl(controls, 'style', 'cinematic'),
        duration: durationSeconds(stringControl(controls, 'duration', '90s'), 90),
        aspectRatio: stringControl(controls, 'format', '16:9'),
        appSlug,
        provider,
        model: route.selectedModel,
        capability,
      }) as Request)
      const data = await readJson(response)
      const artifact = data.artifactId ? { id: data.artifactId, storageUrl: data.storageUrl } : null
      return NextResponse.json({
        success: Boolean(data.success),
        executed: Boolean(data.executed),
        capability,
        provider: data.provider ?? route.selectedProvider,
        model: data.model ?? route.selectedModel,
        jobStatus: data.jobStatus ?? data.status ?? 'processing',
        artifactId: data.artifactId ?? null,
        storageUrl: data.storageUrl ?? null,
        error: data.error ?? null,
        blocker: data.blocker ?? data.error ?? null,
        result: data,
        artifact,
        route,
      }, { status: response.status })
    }

    if (tab === 'Music / Audio') {
      const genres = stringArrayControl(controls, 'genres', [stringControl(controls, 'genre', 'cinematic')]).slice(0, 5)
      const duration = Math.max(180, durationSeconds(stringControl(controls, 'duration', '180s'), 180))
      const bpm = Math.max(0, Math.round(numberControl(controls, 'bpm', 0)))
      const vocalStyle = stringControl(controls, 'vocalStyle', stringControl(controls, 'vocals', 'instrumental_only'))
      const songStructure = {
        intro: stringControl(controls, 'intro', ''),
        verse: stringControl(controls, 'verse', ''),
        chorus: stringControl(controls, 'chorus', ''),
        bridge: stringControl(controls, 'bridge', ''),
        outro: stringControl(controls, 'outro', ''),
      }
      const musicVideoHandoff = {
        enabled: stringControl(controls, 'musicVideoEnabled', 'off') === 'on',
        visualStyle: stringControl(controls, 'musicVideoVisualStyle', ''),
        storyConcept: stringControl(controls, 'musicVideoStoryConcept', ''),
        aspectRatio: stringControl(controls, 'musicVideoAspectRatio', '16:9'),
        durationTargetSeconds: durationSeconds(stringControl(controls, 'musicVideoDuration', `${duration}s`), duration),
        sceneCount: Math.max(1, Math.round(numberControl(controls, 'musicVideoSceneCount', 6))),
      }
      const productionNotes = [
        `Mood: ${stringControl(controls, 'mood', 'uplifting')}`,
        bpm > 0 ? `BPM: ${bpm}` : 'BPM: auto',
        `Language: ${stringControl(controls, 'language', 'English')}`,
        `Song count requested: ${Math.max(1, Math.round(numberControl(controls, 'count', 1)))}`,
        `Structure: intro=${songStructure.intro || 'auto'}; verse=${songStructure.verse || 'auto'}; chorus=${songStructure.chorus || 'auto'}; bridge=${songStructure.bridge || 'auto'}; outro=${songStructure.outro || 'auto'}`,
        musicVideoHandoff.enabled
          ? `Music-video handoff: ${musicVideoHandoff.visualStyle || 'auto visual style'}; ${musicVideoHandoff.storyConcept || 'auto story'}; ${musicVideoHandoff.aspectRatio}; ${musicVideoHandoff.sceneCount} scenes; ${musicVideoHandoff.durationTargetSeconds}s target.`
          : 'Music-video handoff: off',
      ].join('\n')
      const response = await musicPost(jsonRequest('/api/admin/music-studio', {
        action: 'create_async',
        request: {
          appSlug,
          theme: prompt,
          genre: genres[0] ?? 'cinematic',
          genres,
          moods: [stringControl(controls, 'mood', 'uplifting')],
          mood: stringControl(controls, 'mood', 'uplifting'),
          vocalStyle,
          instrumental: vocalStyle === 'instrumental_only' || stringControl(controls, 'instrumental', 'off') === 'on',
          existingLyrics: stringControl(controls, 'lyrics', ''),
          durationSeconds: duration,
          bpm,
          language: stringControl(controls, 'language', 'English'),
          productionNotes,
          count: Math.max(1, Math.round(numberControl(controls, 'count', 1))),
          songStructure,
          musicVideoHandoff,
          prompt: `${prompt}\n\n${productionNotes}`,
          provider: route.selectedProvider,
          model: route.selectedModel,
        },
      }))
      const data = await readJson(response)
      const status = String(data.jobStatus ?? data.status ?? 'failed')
      const completed = ['completed', 'succeeded'].includes(status)
        && Boolean(data.artifactId || data.storageUrl || data.audioUrl || data.musicUrl)
      const processing = ['queued', 'processing', 'submitted'].includes(status)
      const success = completed || processing
      const selectedProvider = canonicalProviderValue(data.provider, route.selectedProvider)
      const selectedModel = data.model ?? route.selectedModel
      const proof = completed
        ? await recordStudioProof({
          mode: 'music',
          capability: 'music_generation',
          appSlug,
          provider: selectedProvider,
          model: selectedModel,
          success: true,
          executed: true,
          artifactId: data.artifactId ?? null,
          artifactPath: data.storageUrl ?? null,
          jobId: data.jobId ?? null,
          routePath: '/api/admin/music-studio',
          metadata: {
            source: 'studio_execute',
            truth: preflight?.truth ? capabilityTruthProof(preflight.truth) : null,
            genres,
            durationSeconds: duration,
            bpm,
            songStructure,
            musicVideoHandoff,
          },
        })
        : studioProofSnapshot({
          capability: 'music_generation',
          provider: selectedProvider,
          model: selectedModel,
          route: '/api/admin/music-studio',
          artifactId: null,
          jobId: data.jobId ?? null,
          proofStatus: processing ? 'processing' : 'failed',
          error: data.blocker ?? data.error ?? null,
        })
      return NextResponse.json(structuredResult({
        ok: success,
        mode: 'music',
        capability: 'music_generation',
        status,
        output: data.musicUrl ?? data.audioUrl ?? data.storageUrl ?? null,
        artifact: data.artifact ?? null,
        job: data.jobId ? { jobId: data.jobId, pollUrl: data.pollUrl ?? null, status } : null,
        selectedProvider,
        selectedModel,
        proof,
        blocker: data.blocker ?? data.error ?? null,
        nextAction: completed ? 'Open the artifact.' : processing ? 'Poll the job until completed.' : data.blocker ?? data.error ?? 'Music provider did not return audio or a trackable job.',
        extra: {
          ...data,
          jobStatus: status,
          jobId: data.jobId ?? null,
          pollUrl: data.pollUrl ?? null,
          artifactId: data.artifactId ?? null,
          storageUrl: data.storageUrl ?? null,
          audioUrl: data.audioUrl ?? null,
          musicUrl: data.musicUrl ?? null,
          error: data.error ?? null,
          result: data,
          route,
          requestProof: {
            genres,
            durationSeconds: duration,
            lyrics: Boolean(stringControl(controls, 'lyrics', '')),
            songStructure,
            vocalStyle,
            mood: stringControl(controls, 'mood', 'uplifting'),
            bpm,
            count: Math.max(1, Math.round(numberControl(controls, 'count', 1))),
          },
        },
      }), { status: response.status })
    }

    if (tab === 'Voice / TTS' || capability === 'adult_voice') {
      const provider = ['genx', 'huggingface'].includes(String(route.selectedProvider))
        ? route.selectedProvider
        : 'auto'
      const response = await ttsPost(jsonRequest('/api/brain/tts', {
        text: prompt,
        provider,
        model: provider === 'auto' ? undefined : route.selectedModel,
        voiceId: body.voiceId ?? stringControl(controls, 'voice', ''),
        speed: stringControl(controls, 'speed', 'normal'),
        appSlug,
        capability,
      }))
      const data = await readJson(response)
      const artifact = data.artifactId ? { id: data.artifactId, storageUrl: data.storageUrl } : null
      return NextResponse.json({
        ...data,
        result: data,
        artifact,
        route,
      }, { status: response.status })
    }

    if (tab === 'Adult') {
      if (body.mode === 'image') {
        const response = await adultImagePost(jsonRequest('/api/brain/adult-image', {
          prompt,
          appSlug,
          size: body.size ?? '768x768',
          provider: route.selectedProvider,
          model: route.selectedModel,
        }))
        const data = await readJson(response)
        const artifact = data.artifactId ? { id: data.artifactId, storageUrl: data.storageUrl } : null
        return NextResponse.json({ ...data, result: data, artifact, route }, { status: response.status })
      }
      const response = await adultTextPost(jsonRequest('/api/brain/adult-text', {
        prompt,
        appSlug,
        provider: route.selectedProvider,
        model: route.selectedModel,
      }))
      const data = await readJson(response)
      const artifact = data.artifactId ? { id: data.artifactId, storageUrl: data.storageUrl } : null
      return NextResponse.json({ ...data, result: data, artifact, route }, { status: response.status })
    }

    return NextResponse.json({ success: false, executed: false, error: `${tab} execution is not available through this route.`, route }, { status: 400 })
  } catch (error) {
    return NextResponse.json({
      success: false,
      executed: false,
      error: error instanceof Error ? error.message : 'Studio execution failed',
      route,
    }, { status: 500 })
  }
}
