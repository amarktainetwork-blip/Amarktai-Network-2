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
import { STUDIO_ROUTE_MAP, getStudioRouteConfig, type StudioTab } from '@/lib/studio-route-map'
import { callProvider } from '@/lib/brain'
import { recordEstimatedCost } from '@/lib/cost-tracking'
import { callGenXChat } from '@/lib/genx-client'
import { normalizeProviderVideoCount, normalizeProviderVideoDuration } from '@/lib/provider-video-policy'
import type { LiveRouteResult } from '@/lib/live-ai-routing'
import { POST as researchAssistPost } from '@/app/api/admin/research/assist/route'
import { POST as imagePost } from '@/app/api/brain/image/route'
import { POST as videoPost } from '@/app/api/brain/video-generate/route'
import { POST as longFormVideoPost } from '@/app/api/brain/long-form-video/route'
import { POST as ttsPost } from '@/app/api/brain/tts/route'
import { POST as avatarVideoPost } from '@/app/api/brain/avatar-video/route'
import { POST as musicPost } from '@/app/api/admin/music-studio/route'

type ExecuteBody = {
  tab?: StudioTab | string
  prompt?: string
  provider?: unknown
  model?: unknown
  providerOverride?: unknown
  modelOverride?: unknown
  capability?: string
  costMode?: 'cheap' | 'balanced' | 'premium'
  qualityTier?: 'basic' | 'standard' | 'high' | 'premium'
  appSlug?: string
  workspaceId?: string
  brandId?: string
  adultPolicy?: string
  mode?: string
  voiceId?: string
  size?: string
  style?: string
  controls?: Record<string, unknown>
}

type StudioExecutionMode = 'chat' | 'image' | 'music' | 'text' | 'video' | 'long_video' | 'image_to_video' | 'voice' | 'avatar' | 'stt'
type RouteProofMode = 'chat' | 'image' | 'music'
type ProofMode = RouteProofMode | 'video' | 'avatar' | 'voice'
type StudioChatProvider = 'groq' | 'together' | 'genx'

const STUDIO_CHAT_EXECUTION_MODELS = {
  genx: 'gpt-5.4-mini',
  groq: 'llama-3.3-70b-versatile',
  together: 'meta-llama/Llama-3-70b-chat-hf',
} satisfies Record<StudioChatProvider, string>

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

function normalizeCapability(tab: StudioTab, adultMode?: string, requestedCapability?: string): AiCapability {
  if (requestedCapability === 'image_to_video') return 'image_to_video'
  if (requestedCapability === 'long_form_video') return 'video_generation'
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
  if (bodyMode === 'long-video' || bodyMode === 'long_form_video') return 'long_video'
  if (bodyMode === 'image-to-video' || bodyMode === 'image_to_video') return 'image_to_video'
  if (bodyMode === 'tts') return 'voice'
  if (bodyMode === 'stt') return 'stt'
  if (bodyMode === 'avatar') return 'avatar'
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

function isStudioTab(value: unknown): value is StudioTab {
  return typeof value === 'string' && value in STUDIO_ROUTE_MAP
}

function nonExecutableModeBlocker(mode: unknown) {
  if (mode === 'automation') {
    return {
      capability: 'scheduler',
      blocker: 'Automation setup is visible in Studio, but execution is not wired through the Studio execute route.',
      nextAction: 'Use the Scheduler admin route after an automation execution contract is implemented.',
    }
  }
  if (mode === 'publishing') {
    return {
      capability: 'social_publishing',
      blocker: 'Social publishing execution is not implemented in this proof pack.',
      nextAction: 'Wire a real publishing provider and approval flow before enabling Studio publishing execution.',
    }
  }
  if (mode === 'trading') {
    return {
      capability: 'trading_analysis',
      blocker: 'Trading execution is not implemented in this proof pack.',
      nextAction: 'Wire read-only analysis first; do not enable trade execution without a proven broker contract.',
    }
  }
  if (mode === 'adult_private') {
      return {
        capability: 'adult_private',
        blocker: 'Adult private generation is deferred from the active V1 runtime.',
        nextAction: 'Reintroduce adult execution only through a separate approved V2 policy, endpoint, and proof gate.',
      }
  }
  return null
}

function proofCapability(mode: StudioExecutionMode, capability: AiCapability) {
  if (mode === 'chat') return 'chat'
  if (mode === 'image') return 'image_generation'
  if (mode === 'music') return 'music_generation'
  if (mode === 'image_to_video') return 'image_to_video'
  if (mode === 'long_video') return 'long_form_video'
  if (mode === 'avatar') return 'avatar_video'
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

function effectiveStudioCostMode(body: ExecuteBody) {
  if (body.costMode === 'premium' || body.qualityTier === 'high' || body.qualityTier === 'premium') return 'premium'
  if (body.costMode === 'cheap' || body.qualityTier === 'basic') return 'cheap'
  return 'balanced'
}

function selectStudioProvider(
  mode: StudioExecutionMode,
  truth?: CapabilityRuntimeTruthEntry | null,
): ProviderMeshId | null {
  if (!truth || !isRouteProofMode(mode)) return null
  for (const candidate of truth.connectedProviderCandidates) {
    const provider = normalizeProviderMeshId(candidate)
    if (!provider) continue
    if (mode === 'chat' && !(provider in STUDIO_CHAT_EXECUTION_MODELS)) continue
    return provider
  }
  return null
}

function isRouteProofMode(mode: StudioExecutionMode): mode is RouteProofMode {
  return mode === 'chat' || mode === 'image' || mode === 'music'
}

function noConnectedStudioProviderResponse(
  mode: StudioExecutionMode,
  capability: string,
  truth?: CapabilityRuntimeTruthEntry | null,
) {
  const supported = truth?.providerCandidates.join(', ') ?? ''
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

function executableStudioChatModel(provider: ProviderMeshId, model?: unknown) {
  const value = typeof model === 'string' ? model.trim() : ''
  if (!value || value === 'auto' || value.startsWith('auto:') || value.startsWith('task:')) {
    return STUDIO_CHAT_EXECUTION_MODELS[provider as keyof typeof STUDIO_CHAT_EXECUTION_MODELS]
  }
  return value
}

function connectedStudioProviders(truth?: CapabilityRuntimeTruthEntry | null) {
  return new Set(
    (truth?.connectedProviderCandidates ?? [])
      .map((provider) => normalizeProviderMeshId(provider))
      .filter((provider): provider is ProviderMeshId => Boolean(provider)),
  )
}

function studioChatCandidates(route: LiveRouteResult, truth?: CapabilityRuntimeTruthEntry | null) {
  const connected = connectedStudioProviders(truth)
  const allowed = connected.size > 0
    ? connected
    : new Set<ProviderMeshId>(Object.keys(STUDIO_CHAT_EXECUTION_MODELS) as ProviderMeshId[])
  const candidates: Array<{ provider: ProviderMeshId; model: string; source: 'primary' | 'fallback' | 'connected' }> = []
  const seen = new Set<string>()
  const add = (providerValue: unknown, modelValue: unknown, source: 'primary' | 'fallback' | 'connected') => {
    const provider = canonicalProviderValue(providerValue)
    if (!provider || !allowed.has(provider) || !(provider in STUDIO_CHAT_EXECUTION_MODELS)) return
    const model = executableStudioChatModel(provider, modelValue)
    const key = `${provider}:${model}`
    if (seen.has(key)) return
    seen.add(key)
    candidates.push({ provider, model, source })
  }

  add(route.selectedProvider, route.selectedModel, 'primary')
  for (const fallback of route.fallbackChain) add(fallback.provider, fallback.model, 'fallback')
  for (const provider of connected.size > 0 ? connected : allowed) {
    add(provider, STUDIO_CHAT_EXECUTION_MODELS[provider as keyof typeof STUDIO_CHAT_EXECUTION_MODELS], 'connected')
  }

  return candidates
}

async function executeStudioChat(input: {
  prompt: string
  appSlug: string
  route: LiveRouteResult
  truth?: CapabilityRuntimeTruthEntry | null
}) {
  const candidates = studioChatCandidates(input.route, input.truth)
  const attempts: Array<{ provider: ProviderMeshId; model: string; source: string; ok: boolean; error: string | null }> = []

  for (const candidate of candidates) {
    const result = candidate.provider === 'genx'
      ? await callGenXChat({ model: candidate.model, messages: [{ role: 'user', content: input.prompt }] })
      : await callProvider(candidate.provider, candidate.model, input.prompt)
    const ok = candidate.provider === 'genx'
      ? 'success' in result && result.success && Boolean(result.output)
      : 'ok' in result && result.ok && Boolean(result.output)
    const output = result.output
    const error = result.error ?? (ok ? null : 'Provider returned no output.')
    attempts.push({ ...candidate, ok, error })
    if (ok && output) {
      await recordEstimatedCost({
        provider: candidate.provider,
        model: candidate.model,
        appSlug: input.appSlug,
        agentId: 'studio-chat',
        capability: 'chat',
        runType: 'studio-chat',
        costMode: input.route.costMode,
        estimatedCostUsd: input.route.estimatedCostUsd,
      }).catch(() => null)
      return {
        success: true,
        output,
        provider: candidate.provider,
        model: candidate.model,
        fallbackUsed: candidate.source !== 'primary',
        attempts,
      }
    }
  }

  return {
    success: false,
    output: null,
    provider: null,
    model: null,
    fallbackUsed: attempts.length > 1,
    attempts,
    error: attempts.map((attempt) => `${attempt.provider}/${attempt.model}: ${attempt.error}`).join('; ') || 'No connected chat provider supports Studio execution.',
  }
}

function buildStudioMusicPrompt(input: {
  theme: string
  genres: string[]
  mood: string
  vocalStyle: string
  instrumental: boolean
  duration: number
  bpm: number
  language: string
  count: number
  lyrics: string
  songStructure: Record<string, string>
  productionNotes: string
  musicVideoHandoff: Record<string, unknown>
}) {
  const genreLines = input.genres.map((genre, index) => `${index + 1}. ${genre}${index === 0 ? ' (primary)' : ''}`)
  const structureLines = Object.entries(input.songStructure)
    .map(([section, value]) => `${section}: ${value || 'auto'}`)
  const videoEnabled = input.musicVideoHandoff.enabled === true
  return [
    'Studio song generation brief',
    `Theme: ${input.theme}`,
    `Requested tracks: ${input.count}`,
    `Target duration: ${input.duration} seconds`,
    `Language: ${input.language}`,
    `Mood: ${input.mood}`,
    `BPM: ${input.bpm > 0 ? input.bpm : 'auto'}`,
    `Vocal direction: ${input.instrumental ? 'instrumental only' : input.vocalStyle.replaceAll('_', ' ')}`,
    'Genre priority:',
    ...genreLines,
    'Song structure:',
    ...structureLines,
    input.lyrics ? `Lyrics to preserve:\n${input.lyrics}` : 'Lyrics: generate original lyrics matching the theme, structure, language, mood, and vocal direction.',
    `Production notes:\n${input.productionNotes}`,
    videoEnabled
      ? `Music-video handoff: ${String(input.musicVideoHandoff.visualStyle || 'auto visual style')}; ${String(input.musicVideoHandoff.storyConcept || 'auto story')}; ${String(input.musicVideoHandoff.aspectRatio || '16:9')}; ${String(input.musicVideoHandoff.sceneCount || 'auto')} scenes; ${String(input.musicVideoHandoff.durationTargetSeconds || input.duration)}s target.`
      : 'Music-video handoff: off',
  ].join('\n')
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

  const blockedMode = nonExecutableModeBlocker(body.mode)
  if (blockedMode) {
    return NextResponse.json(blockerResponse({
      mode: 'text',
      capability: blockedMode.capability,
      status: 'blocked',
      blocker: blockedMode.blocker,
      nextAction: blockedMode.nextAction,
    }), { status: 501 })
  }

  if (!isStudioTab(tab)) {
    return NextResponse.json({
      success: false,
      executed: false,
      capability: String(body.capability ?? body.mode ?? 'unknown'),
      status: 'blocked',
      blocker: `Studio tab "${String(tab)}" is not wired to an executable backend route.`,
      nextAction: 'Use a core launch Studio mode or add a real route contract before enabling this mode.',
    }, { status: 501 })
  }

  const config = getStudioRouteConfig(tab)
  if (config.status === 'missing') {
    return NextResponse.json({
      success: false, executed: false, capability: config.capability, provider: null, model: null,
      jobStatus: 'needs_setup', artifactId: null, storageUrl: null, error: config.detail, blocker: config.detail, route: config,
    }, { status: 501 })
  }

  const capability = normalizeCapability(tab, body.mode, body.capability)
  const mode = normalizeMode(body.mode, tab)
  const costMode = effectiveStudioCostMode(body)
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
    const requestedAvatarMode = stringControl(controls, 'avatarMode', stringControl(controls, 'mode', 'image')) === 'video' ? 'video' : 'image'
    const response = await avatarVideoPost(jsonRequest('/api/brain/avatar-video', {
      prompt,
      appSlug,
      mode: requestedAvatarMode,
      avatarName: stringControl(controls, 'avatarName', prompt.slice(0, 48) || 'Studio avatar'),
      style: stringControl(controls, 'style', 'creator_avatar'),
      referenceImageUrl: stringControl(controls, 'referenceImageUrl', ''),
      voice: stringControl(controls, 'voice', ''),
      script: stringControl(controls, 'script', prompt),
      duration: normalizeProviderVideoDuration(durationSeconds(stringControl(controls, 'duration', '8s'), 8)),
      library: stringControl(controls, 'library', 'default'),
    }))
    const data = await readJson(response)
    const status = String(data.jobStatus ?? data.status ?? 'failed')
    const processing = ['queued', 'processing', 'submitted'].includes(status)
    const completed = ['completed', 'succeeded'].includes(status) && Boolean(data.artifactId && data.storageUrl)
    const avatarProofCapability = String(data.capability ?? (requestedAvatarMode === 'video' ? 'avatar_video' : 'avatar_image'))
    const selectedProvider = canonicalProviderValue(data.provider) ?? 'genx'
    const selectedModel = data.model ?? null
    const proof = completed
      ? await recordStudioProof({
        mode: 'avatar',
        capability: avatarProofCapability,
        appSlug,
        provider: selectedProvider,
        model: selectedModel,
        success: true,
        executed: true,
        artifactId: data.artifactId ?? null,
        artifactPath: data.storageUrl ?? null,
        jobId: data.jobId ?? null,
        routePath: '/api/brain/avatar-video',
        metadata: { source: 'studio_execute', avatar: data.avatar ?? null, mode: requestedAvatarMode },
      })
      : studioProofSnapshot({
        capability: avatarProofCapability,
        provider: selectedProvider,
        model: selectedModel,
        route: '/api/brain/avatar-video',
        artifactId: null,
        jobId: data.jobId ?? null,
        proofStatus: processing ? 'processing' : 'failed',
        error: data.blocker ?? data.error ?? null,
      })
    return NextResponse.json({
      ...data,
      result: data,
      artifact: data.artifact ?? (data.artifactId ? { id: data.artifactId, storageUrl: data.storageUrl } : null),
      proof,
      selectedProvider,
      selectedModel,
      output: data.videoUrl ?? data.imageUrl ?? data.mediaUrl ?? data.storageUrl ?? null,
    }, { status: response.status })
  }

  const route = routeLiveModel({
    capability,
    appSlug,
    selectedProvider: studioProvider ?? undefined,
    selectedModel: undefined,
    costMode,
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
      const chat = await executeStudioChat({ prompt, appSlug, route, truth: preflight?.truth })
      const output = chat.output
      const selectedProvider = chat.provider
      const selectedModel = chat.model
      const success = chat.success
      const proof = await recordStudioProof({
        mode: 'chat',
        capability: 'chat',
        appSlug,
        provider: selectedProvider,
        model: selectedModel,
        success,
        executed: success,
        routePath: '/api/admin/studio/execute',
        metadata: { source: 'studio_execute', noArtifact: true, fallbackUsed: chat.fallbackUsed, attempts: chat.attempts, truth: preflight?.truth ? capabilityTruthProof(preflight.truth) : null },
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
        blocker: success ? null : chat.error ?? 'Chat runtime returned no output.',
        nextAction: success ? null : 'Check provider configuration and retry the Studio chat request.',
        extra: {
          result: {
            output,
            provider: selectedProvider,
            model: selectedModel,
            fallbackUsed: chat.fallbackUsed,
            attempts: chat.attempts,
          },
          route,
          fallbackUsed: chat.fallbackUsed,
          attempts: chat.attempts,
          routingPolicy: {
            budget: body.costMode ?? 'balanced',
            qualityTier: body.qualityTier ?? 'standard',
            effectiveCostMode: costMode,
            reason: route.reason,
          },
        },
      }), { status: success ? 200 : 502 })
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
      const response = await imagePost(jsonRequest('/api/brain/image', {
        prompt,
        size: body.size ?? stringControl(controls, 'size', '1024x1024'),
        style: body.style ?? stringControl(controls, 'style', 'premium realistic'),
        // Use preferProvider (not providerOverride) so the image route can fallback
        // to the next eligible provider if the preferred one fails.
        // noFallback is not set — Studio always wants a result if any provider can deliver it.
        preferProvider: route.selectedProvider,
        costMode,
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

    if (tab === 'Video') {
      const requestedDuration = durationSeconds(stringControl(controls, 'duration', mode === 'long_video' ? '90s' : '30s'), mode === 'long_video' ? 90 : 30)
      const aspectRatio = stringControl(controls, 'format', '16:9')
      const style = body.style ?? stringControl(controls, 'style', 'cinematic')
      const referenceImageUrl = stringControl(controls, 'referenceImageUrl', '')
      if (mode === 'long_video') {
        const response = await longFormVideoPost(jsonRequest('/api/brain/long-form-video', {
          prompt,
          appSlug,
          style,
          duration: Math.max(90, requestedDuration),
          aspectRatio,
          productionNotes: stringControl(controls, 'productionNotes', ''),
          sceneCount: Math.max(1, Math.round(numberControl(controls, 'sceneCount', 6))),
          voice: stringControl(controls, 'voice', 'on'),
          music: stringControl(controls, 'music', 'on'),
          stitching: stringControl(controls, 'stitching', 'on'),
          metadata: { source: 'studio_execute', workspaceId: body.workspaceId ?? null, brandId: body.brandId ?? null },
        }))
        const data = await readJson(response)
        const status = String(data.jobStatus ?? data.status ?? 'processing')
        const completed = ['completed', 'succeeded'].includes(status) && Boolean(data.artifactId && data.storageUrl)
        const processing = ['queued', 'processing', 'submitted'].includes(status)
        const proof = completed
          ? await recordStudioProof({
            mode: 'video',
            capability: 'long_form_video',
            appSlug,
            provider: data.provider ?? route.selectedProvider,
            model: data.model ?? route.selectedModel,
            success: true,
            executed: true,
            artifactId: data.artifactId ?? null,
            artifactPath: data.storageUrl ?? null,
            jobId: data.jobId ?? null,
            routePath: '/api/brain/long-form-video',
            metadata: { source: 'studio_execute', strategy: data.strategy ?? null, phase: data.phase ?? null },
          })
          : studioProofSnapshot({
            capability: 'long_form_video',
            provider: data.provider ?? route.selectedProvider,
            model: data.model ?? route.selectedModel,
            route: '/api/brain/long-form-video',
            artifactId: null,
            jobId: data.jobId ?? null,
            proofStatus: processing ? 'processing' : 'failed',
            error: data.blocker ?? data.error ?? null,
          })
        return NextResponse.json({
          success: Boolean(data.success),
          executed: Boolean(data.executed),
          capability: 'long_form_video',
          provider: data.provider ?? route.selectedProvider,
          model: data.model ?? route.selectedModel,
          strategy: data.strategy ?? null,
          phase: data.phase ?? null,
          jobStatus: status,
          status,
          artifactId: data.artifactId ?? null,
          storageUrl: data.storageUrl ?? null,
          videoUrl: data.videoUrl ?? data.storageUrl ?? null,
          error: data.error ?? null,
          blocker: data.blocker ?? data.error ?? null,
          result: data,
          artifact: data.artifactId ? { id: data.artifactId, storageUrl: data.storageUrl } : null,
          proof,
          pollUrl: data.pollUrl ?? null,
          route,
        }, { status: response.status })
      }
      if (mode === 'image_to_video' && !referenceImageUrl) {
        const blocker = 'Image-to-video requires a referenceImageUrl or uploaded image artifact before execution.'
        return NextResponse.json(blockerResponse({
          mode,
          capability: 'image_to_video',
          status: 'blocked',
          blocker,
          nextAction: 'Provide a platform artifact URL or uploaded image reference, then retry image-to-video.',
          route,
        }), { status: 400 })
      }
      if (mode === 'video' && requestedDuration > 30) {
        const blocker = 'Short Studio video generation is limited to 30 seconds by the current backend route. Use Long-form Video for 1m30s+ planning, or wire a long-form renderer.'
        return NextResponse.json(blockerResponse({
          mode,
          capability: 'video_generation',
          status: 'blocked',
          blocker,
          nextAction: 'Choose 30s or less for short video, or implement the long-form renderer/stitcher.',
          route,
        }), { status: 400 })
      }
      if (route.selectedProvider !== 'genx') {
        const blocker = `${route.selectedProvider ?? 'Selected provider'} is selected by routing for ${mode}, but /api/brain/video-generate is currently wired only to GenX video execution. No silent GenX fallback was applied.`
        return NextResponse.json(blockerResponse({
          mode,
          capability: mode === 'image_to_video' ? 'image_to_video' : 'video_generation',
          status: 'blocked',
          blocker,
          nextAction: 'Wire this provider into /api/brain/video-generate or let routing select GenX for this capability.',
          route,
        }), { status: 409 })
      }
      const provider = route.selectedProvider
      const response = await videoPost(jsonRequest('/api/brain/video-generate', {
        prompt,
        style,
        duration: normalizeProviderVideoDuration(requestedDuration),
        aspectRatio,
        count: normalizeProviderVideoCount(numberControl(controls, 'count', 1)),
        referenceImageUrl: mode === 'image_to_video' ? referenceImageUrl : undefined,
        appSlug,
        provider,
        model: route.selectedModel,
        capability: mode === 'image_to_video' ? 'image_to_video' : capability,
      }) as Request)
      const data = await readJson(response)
      const artifact = data.artifactId ? { id: data.artifactId, storageUrl: data.storageUrl } : null
      const status = String(data.jobStatus ?? data.status ?? 'processing')
      const completed = ['completed', 'succeeded'].includes(status) && Boolean(data.artifactId && data.storageUrl)
      const processing = ['queued', 'processing', 'submitted'].includes(status)
      const proofCapabilityName = mode === 'image_to_video' ? 'image_to_video' : 'video_generation'
      const proof = completed
        ? await recordStudioProof({
          mode: 'video',
          capability: proofCapabilityName,
          appSlug,
          provider: data.provider ?? route.selectedProvider,
          model: data.model ?? route.selectedModel,
          success: true,
          executed: true,
          artifactId: data.artifactId ?? null,
          artifactPath: data.storageUrl ?? null,
          jobId: data.jobId ?? null,
          routePath: '/api/brain/video-generate',
          metadata: { source: 'studio_execute', mode, referenceImageUrl: referenceImageUrl || null },
        })
        : studioProofSnapshot({
          capability: proofCapabilityName,
          provider: data.provider ?? route.selectedProvider,
          model: data.model ?? route.selectedModel,
          route: '/api/brain/video-generate',
          artifactId: null,
          jobId: data.jobId ?? null,
          proofStatus: processing ? 'processing' : 'failed',
          error: data.blocker ?? data.error ?? null,
        })
      return NextResponse.json({
        success: Boolean(data.success),
        executed: Boolean(data.executed),
        capability: proofCapabilityName,
        provider: data.provider ?? route.selectedProvider,
        model: data.model ?? route.selectedModel,
        jobStatus: status,
        artifactId: data.artifactId ?? null,
        storageUrl: data.storageUrl ?? null,
        videoUrl: data.videoUrl ?? data.storageUrl ?? null,
        error: data.error ?? null,
        blocker: data.blocker ?? data.error ?? null,
        result: data,
        artifact,
        proof,
        route,
      }, { status: response.status })
    }

    if (tab === 'Music / Audio') {
      const genres = stringArrayControl(controls, 'genres', [stringControl(controls, 'genre', 'cinematic')]).slice(0, 5)
      const duration = Math.max(180, durationSeconds(stringControl(controls, 'duration', '180s'), 180))
      const bpm = Math.max(0, Math.round(numberControl(controls, 'bpm', 0)))
      const vocalStyle = stringControl(controls, 'vocalStyle', stringControl(controls, 'vocals', 'instrumental_only'))
      const instrumental = vocalStyle === 'instrumental_only' || stringControl(controls, 'instrumental', 'off') === 'on'
      const mood = stringControl(controls, 'mood', 'uplifting')
      const language = stringControl(controls, 'language', 'English')
      const count = Math.max(1, Math.round(numberControl(controls, 'count', 1)))
      const lyrics = stringControl(controls, 'lyrics', '')
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
        `Language: ${language}`,
        `Song count requested: ${count}`,
        `Structure: intro=${songStructure.intro || 'auto'}; verse=${songStructure.verse || 'auto'}; chorus=${songStructure.chorus || 'auto'}; bridge=${songStructure.bridge || 'auto'}; outro=${songStructure.outro || 'auto'}`,
        musicVideoHandoff.enabled
          ? `Music-video handoff: ${musicVideoHandoff.visualStyle || 'auto visual style'}; ${musicVideoHandoff.storyConcept || 'auto story'}; ${musicVideoHandoff.aspectRatio}; ${musicVideoHandoff.sceneCount} scenes; ${musicVideoHandoff.durationTargetSeconds}s target.`
          : 'Music-video handoff: off',
      ].join('\n')
      const productionPrompt = buildStudioMusicPrompt({
        theme: prompt,
        genres,
        mood,
        vocalStyle,
        instrumental,
        duration,
        bpm,
        language,
        count,
        lyrics,
        songStructure,
        productionNotes,
        musicVideoHandoff,
      })
      const response = await musicPost(jsonRequest('/api/admin/music-studio', {
        action: 'create_async',
        request: {
          appSlug,
          theme: prompt,
          genre: genres[0] ?? 'cinematic',
          genres,
          moods: [mood],
          mood,
          vocalStyle,
          instrumental,
          existingLyrics: lyrics,
          durationSeconds: duration,
          bpm,
          language,
          productionNotes,
          count,
          songStructure,
          musicVideoHandoff,
          prompt: productionPrompt,
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
            productionPrompt,
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
            lyrics: Boolean(lyrics),
            songStructure,
            vocalStyle,
            mood,
            bpm,
            count,
            productionPrompt,
          },
        },
      }), { status: response.status })
    }

    if (tab === 'Voice / TTS') {
      const provider = ['genx', 'groq'].includes(String(route.selectedProvider))
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
      const status = String(data.jobStatus ?? data.status ?? 'failed')
      const completed = ['completed', 'succeeded'].includes(status) && Boolean(data.artifactId && data.storageUrl)
      const processing = ['queued', 'processing', 'submitted'].includes(status)
      const selectedProvider = canonicalProviderValue(data.provider, route.selectedProvider)
      const selectedModel = data.model ?? route.selectedModel
      const proof = completed
        ? await recordStudioProof({
          mode: 'voice',
          capability,
          appSlug,
          provider: selectedProvider,
          model: selectedModel,
          success: true,
          executed: true,
          artifactId: data.artifactId ?? null,
          artifactPath: data.storageUrl ?? null,
          jobId: data.jobId ?? null,
          routePath: '/api/brain/tts',
          metadata: { source: 'studio_execute', truth: preflight?.truth ? capabilityTruthProof(preflight.truth) : null },
        })
        : studioProofSnapshot({
          capability,
          provider: selectedProvider,
          model: selectedModel,
          route: '/api/brain/tts',
          artifactId: null,
          jobId: data.jobId ?? null,
          proofStatus: processing ? 'processing' : 'failed',
          error: data.blocker ?? data.error ?? null,
        })
      return NextResponse.json(structuredResult({
        ok: Boolean(data.success),
        mode: 'voice',
        capability,
        status,
        output: data.audioUrl ?? data.storageUrl ?? null,
        artifact,
        job: data.jobId ? { jobId: data.jobId, pollUrl: data.pollUrl ?? null, status } : null,
        selectedProvider,
        selectedModel,
        proof,
        blocker: data.blocker ?? data.error ?? null,
        nextAction: completed ? 'Open the artifact.' : processing ? 'Poll the job until completed.' : data.blocker ?? data.error ?? 'TTS provider did not return persisted audio.',
        extra: {
          ...data,
          result: data,
          artifactId: data.artifactId ?? null,
          storageUrl: data.storageUrl ?? null,
          audioUrl: data.audioUrl ?? data.storageUrl ?? null,
          jobId: data.jobId ?? null,
          pollUrl: data.pollUrl ?? null,
          route,
        },
      }), { status: response.status })
    }

    if (tab === 'Adult') {
      return NextResponse.json(blockerResponse({
        mode,
        capability,
        status: 'blocked',
        blocker: 'Adult execution is deferred from the active V1 runtime.',
        nextAction: 'Keep adult disabled until a separate approved policy, endpoint, and proof gate is introduced.',
        route,
      }), { status: 409 })
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
