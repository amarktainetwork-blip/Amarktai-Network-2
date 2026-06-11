import { createArtifact } from '@/lib/artifact-store'
import { callProvider, getVaultApiKey } from '@/lib/brain'
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

export interface CapabilityRequest {
  input: string
  capability?: string
  files?: string[]
  appId?: string
  workspaceId?: string
  providerOverride?: string
  modelOverride?: string
  adultMode?: boolean
  safeMode?: boolean
  saveArtifact?: boolean
  traceId?: string
  metadata?: Record<string, unknown>
}

export interface CapabilityResponse {
  success: boolean
  capability: string
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
  error_category?: 'missing_key' | 'provider_policy_block' | 'model_not_supported' | 'endpoint_error' | 'guardrail_block' | 'unknown'
  providerAttempts?: Array<{ provider: string; model: string; status: string; error?: string }>
}

const TEXT_PROVIDER_PRIORITY = ['genx', 'groq', 'together', 'qwen', 'mimo', 'huggingface'] as const
const ADULT_TEXT_PROVIDER_PRIORITY = ['together', 'huggingface'] as const
const ADULT_BLOCKED_TERMS = [
  'minor',
  'child',
  'underage',
  'preteen',
  'infant',
  'non-consensual',
  'rape',
  'forced sex',
  'dehumanizing',
  'dehumanising',
] as const

function detectCapability(input: string, requested?: string): string {
  if (requested) return requested
  const value = input.toLowerCase()
  if (value.includes('scrape ') || value.includes('crawl ') || /^https?:\/\//.test(value)) return 'scrape_website'
  if (value.includes('image')) return 'image_generation'
  if (value.includes('video')) return 'video_generation'
  if (value.includes('voice') || value.includes('speak')) return 'tts'
  if (value.includes('code') || value.includes('repository')) return 'code'
  return 'chat'
}

function outputTypeFor(capability: string): string {
  if (capability.includes('image')) return 'image'
  if (capability.includes('video')) return 'video'
  if (capability === 'tts' || capability === 'stt' || capability === 'voice_response' || capability.includes('music')) return 'audio'
  if (capability === 'code' || capability === 'repo_edit' || capability === 'app_build') return 'code'
  return 'text'
}

function adultBlockReason(request: CapabilityRequest): string | null {
  if (!request.adultMode) return 'Adult mode is off. Explicit operator opt-in is required.'
  if (request.safeMode) return 'Safe mode is active, so adult content is blocked.'
  const lower = request.input.toLowerCase()
  const blocked = ADULT_BLOCKED_TERMS.find(term => lower.includes(term))
  return blocked ? `Adult request blocked by the "${blocked}" guardrail.` : null
}

async function saveArtifact(
  request: CapabilityRequest,
  capability: string,
  provider: string,
  model: string,
  output: string,
): Promise<string | undefined> {
  if (!request.saveArtifact) return undefined
  const type = outputTypeFor(capability)
  const artifact = await createArtifact({
    appSlug: request.appId ?? request.workspaceId ?? '__system__',
    type: type === 'code' ? 'code' : type === 'audio' ? 'audio' : type === 'image' ? 'image' : type === 'video' ? 'video' : 'document',
    subType: capability,
    provider,
    model,
    traceId: request.traceId,
    ...(output.startsWith('http://') || output.startsWith('https://')
      ? { contentUrl: output }
      : { content: output }),
  })
  return artifact.id
}

function failure(capability: string, error: string, category: CapabilityResponse['error_category'] = 'endpoint_error'): CapabilityResponse {
  return {
    success: false,
    capability,
    provider: null,
    model: null,
    outputType: outputTypeFor(capability),
    output: null,
    fallbackUsed: false,
    error,
    error_category: category,
  }
}

async function executeImage(request: CapabilityRequest, capability: string): Promise<CapabilityResponse> {
  if (!request.providerOverride || request.providerOverride === 'genx') {
    const model = request.modelOverride ?? GENX_IMAGE_MODELS[0]
    const result = await callGenXMedia({ model, prompt: request.input, type: 'image' })
    if (result.success && result.url) {
      const artifactId = await saveArtifact(request, capability, 'genx', result.model, result.url)
      return { success: true, capability, provider: 'genx', model: result.model, outputType: 'image', output: result.url, artifactId, fallbackUsed: false }
    }
    if (result.success && result.jobId) {
      return { success: true, capability, provider: 'genx', model: result.model, outputType: 'image', output: null, jobId: result.jobId, status: result.status, fallbackUsed: false }
    }
  }

  for (const provider of ['together', 'huggingface'] as const) {
    if (request.providerOverride && request.providerOverride !== provider) continue
    const model = request.modelOverride ?? (provider === 'together'
      ? 'black-forest-labs/FLUX.1-schnell-Free'
      : 'stabilityai/stable-diffusion-xl-base-1.0')
    const result = await callProvider(provider, model, request.input)
    if (result.ok && result.output) {
      const artifactId = await saveArtifact(request, capability, provider, model, result.output)
      return { success: true, capability, provider, model, outputType: 'image', output: result.output, artifactId, fallbackUsed: true }
    }
  }

  return failure(capability, 'No approved image provider is currently ready.', 'missing_key')
}

async function executeMedia(request: CapabilityRequest, capability: string): Promise<CapabilityResponse> {
  const mediaType = capability.includes('video') ? 'video' : 'audio'
  const defaults = mediaType === 'video' ? GENX_VIDEO_MODELS : capability === 'tts' || capability === 'voice_response' ? GENX_TTS_MODELS : GENX_AUDIO_MODELS
  const model = request.modelOverride ?? defaults[0]
  if (request.providerOverride && request.providerOverride !== 'genx') {
    return failure(capability, `Provider "${request.providerOverride}" is not wired for ${capability}.`, 'model_not_supported')
  }
  const result = await callGenXMedia({ model, prompt: request.input, type: mediaType })
  if (result.success && result.url) {
    const artifactId = await saveArtifact(request, capability, 'genx', result.model, result.url)
    return { success: true, capability, provider: 'genx', model: result.model, outputType: outputTypeFor(capability), output: result.url, artifactId, fallbackUsed: false }
  }
  if (result.success && result.jobId) {
    return { success: true, capability, provider: 'genx', model: result.model, outputType: outputTypeFor(capability), output: null, jobId: result.jobId, status: result.status, fallbackUsed: false }
  }
  return failure(capability, `GenX ${capability} is not configured or returned no artifact.`, 'missing_key')
}

async function executeText(
  request: CapabilityRequest,
  capability: string,
  providers: readonly string[] = TEXT_PROVIDER_PRIORITY,
): Promise<CapabilityResponse> {
  const candidates = request.providerOverride ? [request.providerOverride] : providers
  const attempts: NonNullable<CapabilityResponse['providerAttempts']> = []

  for (const provider of candidates) {
    if (!isApprovedDirectProvider(provider)) {
      return failure(capability, `Provider "${provider}" is not approved for direct execution.`, 'model_not_supported')
    }
    const key = await getVaultApiKey(provider)
    const model = request.modelOverride ?? getDefaultModelForProvider(provider)
    if (!key) {
      attempts.push({ provider, model, status: 'needs_key', error: 'Provider credential is not configured.' })
      continue
    }
    const result = await callProvider(provider, model, request.input)
    attempts.push({ provider, model, status: result.ok ? 'ready' : 'test_failed', error: result.error ?? undefined })
    if (result.ok && result.output) {
      const artifactId = await saveArtifact(request, capability, provider, model, result.output)
      return {
        success: true,
        capability,
        provider,
        model,
        outputType: outputTypeFor(capability),
        output: result.output,
        artifactId,
        fallbackUsed: provider !== candidates[0],
        providerAttempts: attempts,
      }
    }
  }

  return {
    ...failure(capability, 'No approved provider is currently ready.', 'missing_key'),
    providerAttempts: attempts,
  }
}

export async function executeCapability(request: CapabilityRequest): Promise<CapabilityResponse> {
  const capability = detectCapability(request.input, request.capability)
  const isAdult = capability === 'adult_text' || capability === 'adult_image' || capability === 'adult_video'

  if (isAdult) {
    const blocked = adultBlockReason(request)
    if (blocked) return failure(capability, blocked, 'guardrail_block')
  }

  if (request.providerOverride && !isApprovedDirectProvider(request.providerOverride)) {
    return failure(capability, `Provider "${request.providerOverride}" is not approved for direct execution.`, 'model_not_supported')
  }

  if (capability === 'scrape_website') {
    const result = await crawlAppWebsite(request.input.trim())
    if (!result.success) return failure(capability, result.error ?? 'Website crawl failed.')
    const output = JSON.stringify({
      summary: result.summary,
      pages: result.pages.length,
      niche: result.detectedNiche,
      features: result.detectedFeatures,
      capabilities: result.aiCapabilitiesNeeded,
    })
    const artifactId = await saveArtifact(request, capability, 'local-crawler', 'local-crawler', output)
    return { success: true, capability, provider: 'local-crawler', model: null, outputType: 'text', output, artifactId, fallbackUsed: false }
  }

  if (capability === 'adult_video') {
    return failure(capability, 'Adult video generation is unavailable because no approved adult-capable video adapter is configured.', 'model_not_supported')
  }

  if (capability === 'adult_text') {
    return executeText(request, capability, ADULT_TEXT_PROVIDER_PRIORITY)
  }

  if (capability === 'image_generation' || capability === 'image_edit' || capability === 'suggestive_image' || capability === 'adult_image') {
    return executeImage(request, capability)
  }

  if (
    capability === 'video_generation' ||
    capability === 'image_to_video' ||
    capability === 'suggestive_video' ||
    capability === 'music_generation' ||
    capability === 'tts' ||
    capability === 'stt' ||
    capability === 'voice_response'
  ) {
    return executeMedia(request, capability)
  }

  return executeText(request, capability)
}
