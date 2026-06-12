import { createArtifact, type ArtifactType } from '@/lib/artifact-store'
import { callProvider, getVaultApiKey } from '@/lib/brain'
import {
  getAppSafetyConfig,
  loadAppSafetyConfigFromDB,
  scanContent,
} from '@/lib/content-filter'
import { crawlAppWebsite } from '@/lib/firecrawl'
import {
  callGenXMedia,
  GENX_AUDIO_MODELS,
  GENX_IMAGE_MODELS,
  GENX_TTS_MODELS,
  GENX_VIDEO_MODELS,
} from '@/lib/genx-client'
import { getDefaultModelForProvider } from '@/lib/model-registry'
import { isApprovedDirectProvider } from '@/lib/provider-mesh'

export const CAPABILITY_ROUTER_CAPABILITIES = [
  'chat',
  'code',
  'file_analysis',
  'image_generation',
  'image_edit',
  'video_generation',
  'image_to_video',
  'music_generation',
  'lyrics_generation',
  'tts',
  'stt',
  'voice_response',
  'adult_text',
  'adult_image',
  'adult_video',
  'adult_voice',
  'suggestive_image',
  'suggestive_video',
  'repo_edit',
  'app_build',
  'deploy_plan',
  'research',
  'scrape_website',
] as const

export type CapabilityRouterCapability =
  (typeof CAPABILITY_ROUTER_CAPABILITIES)[number]
export type CapabilityExecutionState =
  | 'READY'
  | 'NEEDS_CONFIGURATION'
  | 'BLOCKED'
  | 'UNAVAILABLE'

export interface CapabilityRequest {
  input: string
  capability?: CapabilityRouterCapability | string
  files?: string[]
  appId?: string
  workspaceId?: string
  providerOverride?: string
  modelOverride?: string
  provider?: string
  model?: string
  adultMode?: boolean
  safeMode?: boolean
  suggestiveMode?: boolean
  saveArtifact?: boolean
  traceId?: string
  metadata?: Record<string, unknown>
}

export interface CapabilityResponse {
  success: boolean
  capability: CapabilityRouterCapability
  readiness: CapabilityExecutionState
  provider: string | null
  model: string | null
  outputType: string
  output: string | null
  jobId?: string
  status?: 'pending' | 'processing' | 'completed' | 'succeeded' | 'failed'
  artifactId?: string
  fallbackUsed: boolean
  fallbackReason?: string
  warning?: string
  error?: string
  error_category?:
    | 'missing_key'
    | 'provider_policy_block'
    | 'model_not_supported'
    | 'endpoint_error'
    | 'guardrail_block'
    | 'unknown'
  providerAttempts?: Array<{
    provider: string
    model: string
    status: string
    error?: string
  }>
}

const CAPABILITY_SET = new Set<string>(CAPABILITY_ROUTER_CAPABILITIES)
const TEXT_PROVIDER_PRIORITY = [
  'genx',
  'groq',
  'together',
  'qwen',
  'mimo',
  'huggingface',
] as const
const ADULT_TEXT_PROVIDER_PRIORITY = ['together', 'huggingface'] as const
const ADULT_CAPABILITIES = new Set<CapabilityRouterCapability>([
  'adult_text',
  'adult_image',
  'adult_video',
  'adult_voice',
])
const SUGGESTIVE_CAPABILITIES = new Set<CapabilityRouterCapability>([
  'suggestive_image',
  'suggestive_video',
])

function requestedProvider(request: CapabilityRequest): string | undefined {
  return request.providerOverride ?? request.provider
}

function requestedModel(request: CapabilityRequest): string | undefined {
  return request.modelOverride ?? request.model
}

function detectCapability(input: string): CapabilityRouterCapability {
  const value = input.toLowerCase()
  if (/(scrape|crawl|extract).*(website|url|page)|^https?:\/\//.test(value)) {
    return 'scrape_website'
  }
  if (/(edit|modify|change|retouch).*(image|photo|picture)/.test(value)) {
    return 'image_edit'
  }
  if (/(image|photo|picture).*(into|to).*(video|animation)/.test(value)) {
    return 'image_to_video'
  }
  if (/(generate|create|draw|make).*(image|photo|picture|illustration)/.test(value)) {
    return 'image_generation'
  }
  if (/(generate|create|make).*(video|animation|clip)/.test(value)) {
    return 'video_generation'
  }
  if (/(generate|create|compose|make).*(music|song|instrumental|beat)/.test(value)) {
    return 'music_generation'
  }
  if (/(lyrics|verse|chorus|song words)/.test(value)) return 'lyrics_generation'
  if (/(text.to.speech|read aloud|speak this|voice response)/.test(value)) return 'tts'
  if (/(speech.to.text|transcribe|transcription)/.test(value)) return 'stt'
  if (/(analy[sz]e|summari[sz]e|inspect).*(file|document|attachment)/.test(value)) {
    return 'file_analysis'
  }
  if (/(research|investigate|deep dive|find sources)/.test(value)) return 'research'
  if (/(deploy|deployment|release plan|rollout)/.test(value)) return 'deploy_plan'
  if (/(build|create|scaffold).*(app|application|website)/.test(value)) return 'app_build'
  if (/(edit|change|patch|refactor).*(repo|repository|codebase)/.test(value)) {
    return 'repo_edit'
  }
  if (/(code|function|typescript|javascript|python|debug|refactor)/.test(value)) {
    return 'code'
  }
  return 'chat'
}

function resolveCapability(request: CapabilityRequest): CapabilityRouterCapability | null {
  const capability = request.capability ?? detectCapability(request.input)
  return CAPABILITY_SET.has(capability)
    ? (capability as CapabilityRouterCapability)
    : null
}

function outputTypeFor(capability: CapabilityRouterCapability): string {
  if (capability === 'code' || capability === 'repo_edit' || capability === 'app_build') {
    return 'code'
  }
  if (capability.includes('image')) return 'image'
  if (capability.includes('video')) return 'video'
  if (
    capability === 'tts' ||
    capability === 'voice_response' ||
    capability === 'adult_voice' ||
    capability === 'music_generation'
  ) {
    return 'audio'
  }
  return 'text'
}

function artifactTypeFor(
  capability: CapabilityRouterCapability,
): ArtifactType {
  if (capability === 'music_generation') return 'music'
  if (capability === 'stt') return 'transcript'
  if (capability === 'research' || capability === 'scrape_website') return 'research_result'
  if (capability === 'deploy_plan') return 'deployment_plan'
  if (capability === 'app_build') return 'app_blueprint'
  if (capability === 'repo_edit') return 'repo_patch'
  if (capability === 'tts' || capability === 'voice_response' || capability === 'adult_voice') return 'voice'
  const outputType = outputTypeFor(capability)
  if (outputType === 'code' || outputType === 'audio' || outputType === 'image' || outputType === 'video') {
    return outputType
  }
  return 'text'
}

function failure(
  capability: CapabilityRouterCapability,
  readiness: Exclude<CapabilityExecutionState, 'READY'>,
  error: string,
  errorCategory: CapabilityResponse['error_category'],
  provider: string | null = null,
  model: string | null = null,
): CapabilityResponse {
  return {
    success: false,
    capability,
    readiness,
    provider,
    model,
    outputType: outputTypeFor(capability),
    output: null,
    fallbackUsed: false,
    error,
    error_category: errorCategory,
  }
}

async function persistOutput(
  request: CapabilityRequest,
  response: CapabilityResponse,
  output: string,
): Promise<CapabilityResponse> {
  if (!request.saveArtifact) return response
  const artifact = await createArtifact({
    appSlug: request.appId ?? request.workspaceId ?? '__system__',
    appId: request.appId,
    workspaceId: request.workspaceId,
    executionId: typeof request.metadata?.executionId === 'string' ? request.metadata.executionId : undefined,
    jobId: response.jobId,
    type: artifactTypeFor(response.capability),
    subType: response.capability,
    capability: response.capability,
    provider: response.provider ?? undefined,
    model: response.model ?? undefined,
    traceId: request.traceId,
    metadata: request.metadata,
    ...(output.startsWith('http://') || output.startsWith('https://')
      ? { contentUrl: output }
      : { content: output }),
  })
  return { ...response, artifactId: artifact.id }
}

async function policyBlockReason(
  request: CapabilityRequest,
  capability: CapabilityRouterCapability,
): Promise<string | null> {
  const isAdult = ADULT_CAPABILITIES.has(capability)
  const isSuggestive = SUGGESTIVE_CAPABILITIES.has(capability)
  if (!isAdult && !isSuggestive) return null

  if (isAdult && (request.adultMode !== true || request.safeMode !== false)) {
    return 'Adult capability requires explicit adult mode and safe mode off.'
  }
  if (isSuggestive && request.safeMode !== false) {
    return 'Suggestive capability requires safe mode off.'
  }

  if (request.appId) {
    await loadAppSafetyConfigFromDB(request.appId)
    const safety = getAppSafetyConfig(request.appId)
    if (safety.safeMode) return 'The app safety policy has safe mode enabled.'
    if (isAdult && !safety.adultMode) {
      return 'The app safety policy does not enable adult mode.'
    }
    if (isSuggestive && !safety.suggestiveMode) {
      return 'The app safety policy does not enable suggestive mode.'
    }
  }

  const scan = scanContent(request.input)
  return scan.flagged ? scan.message : null
}

async function executeImage(
  request: CapabilityRequest,
  capability: CapabilityRouterCapability,
): Promise<CapabilityResponse> {
  const override = requestedProvider(request)
  const modelOverride = requestedModel(request)
  const attempts: NonNullable<CapabilityResponse['providerAttempts']> = []

  if (capability !== 'adult_image' && (!override || override === 'genx')) {
    const model = modelOverride ?? GENX_IMAGE_MODELS[0]
    const result = await callGenXMedia({
      model,
      prompt: request.input,
      type: 'image',
      metadata: request.metadata,
    })
    attempts.push({
      provider: 'genx',
      model: result.model,
      status: result.success ? result.status : 'failed',
      error: result.error ?? undefined,
    })
    if (result.success && result.url) {
      return persistOutput(
        request,
        {
          success: true,
          capability,
          readiness: 'READY',
          provider: 'genx',
          model: result.model,
          outputType: 'image',
          output: result.url,
          fallbackUsed: false,
          providerAttempts: attempts,
        },
        result.url,
      )
    }
    if (result.success && result.jobId) {
      return {
        success: true,
        capability,
        readiness: 'READY',
        provider: 'genx',
        model: result.model,
        outputType: 'image',
        output: null,
        jobId: result.jobId,
        status: result.status,
        fallbackUsed: false,
        providerAttempts: attempts,
      }
    }
    if (override === 'genx') {
      return failure(
        capability,
        'NEEDS_CONFIGURATION',
        result.error ?? 'GenX image generation is not configured.',
        'missing_key',
        'genx',
        model,
      )
    }
  }

  for (const provider of ['together', 'huggingface'] as const) {
    if (override && override !== provider) continue
    const model =
      modelOverride ??
      (provider === 'together'
        ? 'black-forest-labs/FLUX.1-schnell-Free'
        : 'stabilityai/stable-diffusion-xl-base-1.0')
    if (!(await getVaultApiKey(provider))) {
      attempts.push({
        provider,
        model,
        status: 'needs_key',
        error: 'Provider credential is not configured.',
      })
      continue
    }
    const result = await callProvider(provider, model, request.input)
    attempts.push({
      provider,
      model,
      status: result.ok ? 'ready' : 'failed',
      error: result.error ?? undefined,
    })
    if (result.ok && result.output) {
      return persistOutput(
        request,
        {
          success: true,
          capability,
          readiness: 'READY',
          provider,
          model,
          outputType: 'image',
          output: result.output,
          fallbackUsed: !override && provider !== 'together',
          providerAttempts: attempts,
        },
        result.output,
      )
    }
  }

  return {
    ...failure(
      capability,
      'NEEDS_CONFIGURATION',
      'No approved image provider is currently ready.',
      'missing_key',
    ),
    providerAttempts: attempts,
  }
}

async function executeMedia(
  request: CapabilityRequest,
  capability: CapabilityRouterCapability,
): Promise<CapabilityResponse> {
  const mediaType = capability.includes('video') ? 'video' : 'audio'
  const defaults =
    mediaType === 'video'
      ? GENX_VIDEO_MODELS
      : capability === 'tts' ||
          capability === 'voice_response' ||
          capability === 'adult_voice'
        ? GENX_TTS_MODELS
        : GENX_AUDIO_MODELS
  const provider = requestedProvider(request) ?? 'genx'
  const model = requestedModel(request) ?? defaults[0]

  if (provider !== 'genx') {
    return failure(
      capability,
      'BLOCKED',
      `Provider "${provider}" is not wired for ${capability}.`,
      'model_not_supported',
      provider,
      model,
    )
  }

  const result = await callGenXMedia({
    model,
    prompt: request.input,
    type: mediaType,
    metadata: request.metadata,
  })
  if (result.success && result.url) {
    return persistOutput(
      request,
      {
        success: true,
        capability,
        readiness: 'READY',
        provider: 'genx',
        model: result.model,
        outputType: outputTypeFor(capability),
        output: result.url,
        fallbackUsed: false,
      },
      result.url,
    )
  }
  if (result.success && result.jobId) {
    return {
      success: true,
      capability,
      readiness: 'READY',
      provider: 'genx',
      model: result.model,
      outputType: outputTypeFor(capability),
      output: null,
      jobId: result.jobId,
      status: result.status,
      fallbackUsed: false,
    }
  }
  return failure(
    capability,
    result.error?.toLowerCase().includes('not configured')
      ? 'NEEDS_CONFIGURATION'
      : 'UNAVAILABLE',
    result.error ?? `GenX ${capability} returned no generated output.`,
    result.error?.toLowerCase().includes('not configured') ? 'missing_key' : 'endpoint_error',
    'genx',
    result.model,
  )
}

const SYSTEM_PROMPTS: Partial<Record<CapabilityRouterCapability, string>> = {
  code: 'Return production-quality code and concise implementation notes.',
  file_analysis: 'Analyze the supplied files and ground every conclusion in their contents.',
  lyrics_generation: 'Write original song lyrics. Do not imitate living artists.',
  repo_edit: 'Act as a repository engineer. Return a precise implementation or patch plan.',
  app_build: 'Act as an application builder. Return an implementable architecture and code.',
  deploy_plan: 'Return a deployment plan with prerequisites, rollout, verification, and rollback.',
  research: 'Research carefully and distinguish facts, sources, and uncertainty.',
  adult_text: 'Generate lawful adult text within the active application safety policy.',
}

async function executeText(
  request: CapabilityRequest,
  capability: CapabilityRouterCapability,
  providers: readonly string[] = TEXT_PROVIDER_PRIORITY,
): Promise<CapabilityResponse> {
  const override = requestedProvider(request)
  const candidates = override ? [override] : providers
  const attempts: NonNullable<CapabilityResponse['providerAttempts']> = []
  const input =
    capability === 'file_analysis' && request.files?.length
      ? `${request.input}\n\nAttached files:\n${request.files.join('\n')}`
      : capability === 'file_analysis' && request.metadata?.fileContents
        ? `${request.input}\n\nFile contents:\n${
            typeof request.metadata.fileContents === 'string'
              ? request.metadata.fileContents
              : JSON.stringify(request.metadata.fileContents)
          }`
      : request.input

  for (const provider of candidates) {
    if (!isApprovedDirectProvider(provider)) {
      return failure(
        capability,
        'BLOCKED',
        `Provider "${provider}" is not approved for direct execution.`,
        'provider_policy_block',
        provider,
      )
    }
    const key = await getVaultApiKey(provider)
    let model: string
    try {
      model = requestedModel(request) ?? getDefaultModelForProvider(provider)
    } catch (error) {
      attempts.push({
        provider,
        model: requestedModel(request) ?? 'unresolved',
        status: 'model_not_supported',
        error: error instanceof Error ? error.message : 'No default model is configured.',
      })
      continue
    }
    if (!key) {
      attempts.push({
        provider,
        model,
        status: 'needs_key',
        error: 'Provider credential is not configured.',
      })
      continue
    }

    const result = await callProvider(provider, model, input, SYSTEM_PROMPTS[capability])
    attempts.push({
      provider,
      model,
      status: result.ok ? 'ready' : 'failed',
      error: result.error ?? undefined,
    })
    if (result.ok && result.output) {
      return persistOutput(
        request,
        {
          success: true,
          capability,
          readiness: 'READY',
          provider,
          model,
          outputType: outputTypeFor(capability),
          output: result.output,
          fallbackUsed: provider !== candidates[0],
          providerAttempts: attempts,
        },
        result.output,
      )
    }
  }

  return {
    ...failure(
      capability,
      'NEEDS_CONFIGURATION',
      'No approved provider is currently ready.',
      'missing_key',
    ),
    providerAttempts: attempts,
  }
}

export async function executeCapability(
  request: CapabilityRequest,
): Promise<CapabilityResponse> {
  const capability = resolveCapability(request)
  if (!capability) {
    return failure(
      'chat',
      'BLOCKED',
      `Unknown capability "${request.capability ?? 'unspecified'}".`,
      'model_not_supported',
    )
  }

  const policyReason = await policyBlockReason(request, capability)
  if (policyReason) {
    return failure(capability, 'BLOCKED', policyReason, 'guardrail_block')
  }

  const provider = requestedProvider(request)
  if (provider && !isApprovedDirectProvider(provider)) {
    return failure(
      capability,
      'BLOCKED',
      `Provider "${provider}" is not approved for direct execution.`,
      'provider_policy_block',
      provider,
      requestedModel(request) ?? null,
    )
  }

  if (capability === 'file_analysis' && !request.files?.length && !request.metadata?.fileContents) {
    return failure(
      capability,
      'BLOCKED',
      'File analysis requires files or fileContents metadata.',
      'model_not_supported',
    )
  }

  if (
    capability === 'adult_image' &&
    provider &&
    provider !== 'together' &&
    provider !== 'huggingface'
  ) {
    return failure(
      capability,
      'BLOCKED',
      `Provider "${provider}" is not an approved adult-image executor.`,
      'provider_policy_block',
      provider,
      requestedModel(request) ?? null,
    )
  }

  if (capability === 'stt') {
    return failure(
      capability,
      'BLOCKED',
      'Speech-to-text requires multipart audio input through /api/brain/stt.',
      'model_not_supported',
    )
  }

  if (capability === 'adult_video') {
    return failure(
      capability,
      'UNAVAILABLE',
      'No approved adult-video execution adapter is configured.',
      'model_not_supported',
    )
  }

  if (capability === 'scrape_website') {
    const result = await crawlAppWebsite(request.input.trim())
    if (!result.success) {
      return failure(
        capability,
        result.error?.toLowerCase().includes('not configured')
          ? 'NEEDS_CONFIGURATION'
          : 'UNAVAILABLE',
        result.error ?? 'Website crawl failed.',
        result.error?.toLowerCase().includes('not configured') ? 'missing_key' : 'endpoint_error',
        'firecrawl',
      )
    }
    const output = JSON.stringify({
      summary: result.summary,
      pages: result.pages.length,
      niche: result.detectedNiche,
      features: result.detectedFeatures,
      capabilities: result.aiCapabilitiesNeeded,
    })
    return persistOutput(
      request,
      {
        success: true,
        capability,
        readiness: 'READY',
        provider: 'firecrawl',
        model: null,
        outputType: 'text',
        output,
        fallbackUsed: false,
      },
      output,
    )
  }

  if (capability === 'adult_text') {
    return executeText(request, capability, ADULT_TEXT_PROVIDER_PRIORITY)
  }

  if (
    capability === 'image_generation' ||
    capability === 'image_edit' ||
    capability === 'suggestive_image' ||
    capability === 'adult_image'
  ) {
    return executeImage(request, capability)
  }

  if (
    capability === 'video_generation' ||
    capability === 'image_to_video' ||
    capability === 'suggestive_video' ||
    capability === 'music_generation' ||
    capability === 'tts' ||
    capability === 'voice_response' ||
    capability === 'adult_voice'
  ) {
    return executeMedia(request, capability)
  }

  return executeText(request, capability)
}
