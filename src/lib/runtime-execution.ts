import { NextRequest } from 'next/server'
import { createArtifact } from '@/lib/artifact-store'
import { callProvider } from '@/lib/brain'
import { callGenXChat } from '@/lib/genx-client'
import { routeLiveModel, type AiCapability } from '@/lib/live-ai-routing'
import { POST as imagePost } from '@/app/api/brain/image/route'
import { POST as videoPost } from '@/app/api/brain/video-generate/route'
import { POST as ttsPost } from '@/app/api/brain/tts/route'
import { POST as adultTextPost } from '@/app/api/brain/adult-text/route'
import { POST as adultImagePost } from '@/app/api/brain/adult-image/route'
import { POST as musicPost } from '@/app/api/admin/music-studio/route'

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
  confidenceScore?: number | null
  executionMode?: string
  validationUsed?: boolean
  consensusUsed?: boolean
  memoryUsed?: boolean
  classification?: unknown
  routingReason?: string
  metadata?: Record<string, unknown>
}

const TEXT_CAPABILITIES = new Set([
  'chat',
  'code',
  'coding',
  'reasoning',
  'file_analysis',
  'research',
  'deploy_plan',
  'repo_edit',
  'app_build',
  'lyrics_generation',
])

function jsonRequest(path: string, body: Record<string, unknown>) {
  return new NextRequest(new URL(path, 'http://runtime.local'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return await response.json().catch(() => ({})) as Record<string, unknown>
}

function normalizeRuntimeCapability(value?: string): AiCapability {
  if (value === 'image_generation') return 'image_generation'
  if (value === 'image_to_video') return 'image_to_video'
  if (value === 'video_generation') return 'video_generation'
  if (value === 'music_generation') return 'music_generation'
  if (value === 'tts' || value === 'voice_response') return 'tts'
  if (value === 'stt') return 'stt'
  if (value === 'adult_text') return 'adult_text'
  if (value === 'adult_image') return 'adult_image'
  if (value === 'adult_video') return 'adult_video'
  if (value === 'adult_voice') return 'adult_voice'
  if (value === 'avatar_generation') return 'avatar_video'
  if (value === 'research' || value === 'scrape_website') return 'research'
  if (value === 'code' || value === 'repo_edit' || value === 'app_build') return 'coding'
  return 'chat'
}

function costModeFrom(metadata?: Record<string, unknown>): 'cheap' | 'balanced' | 'premium' {
  const budget = metadata?.budget
  const quality = metadata?.quality
  if (budget === 'premium' || quality === 'high' || quality === 'premium') return 'premium'
  if (budget === 'cheap' || quality === 'basic') return 'cheap'
  return 'balanced'
}

async function maybePersistText(request: CapabilityRequest, result: CapabilityResponse) {
  if (!request.saveArtifact || !result.output) return result
  try {
    const artifact = await createArtifact({
      appSlug: request.appId ?? 'runtime',
      type: 'document',
      subType: result.capability,
      title: `${result.capability}: ${request.input.slice(0, 80)}`,
      provider: result.provider ?? undefined,
      model: result.model ?? undefined,
      content: Buffer.from(result.output, 'utf8'),
      mimeType: 'text/plain',
      metadata: { traceId: request.traceId ?? null, workspaceId: request.workspaceId ?? null },
    })
    return { ...result, artifactId: artifact.id }
  } catch (error) {
    return {
      ...result,
      warning: error instanceof Error ? error.message : 'Artifact persistence failed',
    }
  }
}

async function executeText(request: CapabilityRequest): Promise<CapabilityResponse> {
  const capability = request.capability ?? 'chat'
  const route = routeLiveModel({
    capability: normalizeRuntimeCapability(capability),
    appSlug: request.appId ?? 'runtime',
    selectedProvider: request.providerOverride ?? 'auto',
    selectedModel: request.modelOverride,
    costMode: costModeFrom(request.metadata),
    adultPolicy: request.adultMode ? 'allowed' : 'off',
  })
  if (route.blockedReason || !route.selectedProvider || !route.selectedModel) {
    return {
      success: false,
      capability,
      provider: null,
      model: null,
      outputType: 'text',
      output: null,
      fallbackUsed: false,
      error: route.blockedReason ?? 'No runtime route is available for this capability.',
      error_category: 'model_not_supported',
      metadata: { route },
    }
  }

  const attempts: Array<{ provider: string; model: string; status: string; error?: string }> = []
  const candidates = [
    { provider: route.selectedProvider, model: route.selectedModel },
    ...route.fallbackChain.map((fallback) => ({ provider: fallback.provider, model: fallback.model })),
  ]
  const seen = new Set<string>()
  for (const candidate of candidates) {
    const key = `${candidate.provider}:${candidate.model}`
    if (seen.has(key)) continue
    seen.add(key)
    const result = candidate.provider === 'genx'
      ? await callGenXChat({ model: candidate.model, messages: [{ role: 'user', content: request.input }] })
      : await callProvider(candidate.provider, candidate.model, request.input)
    const ok = candidate.provider === 'genx'
      ? 'success' in result && result.success && Boolean(result.output)
      : 'ok' in result && result.ok && Boolean(result.output)
    const output = result.output
    const error = result.error ?? (ok ? undefined : 'Provider returned no output.')
    attempts.push({ provider: candidate.provider, model: candidate.model, status: ok ? 'ok' : 'failed', ...(error ? { error } : {}) })
    if (ok && output) {
      return maybePersistText(request, {
        success: true,
        capability,
        provider: candidate.provider,
        model: candidate.model,
        outputType: 'text',
        output,
        fallbackUsed: candidate.provider !== route.selectedProvider || candidate.model !== route.selectedModel,
        providerAttempts: attempts,
        routingReason: route.reason,
        metadata: { route },
      })
    }
  }

  return {
    success: false,
    capability,
    provider: null,
    model: null,
    outputType: 'text',
    output: null,
    fallbackUsed: attempts.length > 1,
    providerAttempts: attempts,
    error: attempts.map((attempt) => `${attempt.provider}/${attempt.model}: ${attempt.error ?? attempt.status}`).join('; ') || 'No text provider executed.',
    error_category: 'endpoint_error',
    metadata: { route },
  }
}

function routeStatus(response: Response, data: Record<string, unknown>): CapabilityResponse['error_category'] {
  if (response.status === 403) return 'guardrail_block'
  if (response.status === 503) return 'missing_key'
  if (response.status === 502) return 'endpoint_error'
  if (typeof data.code === 'string' && data.code.includes('key')) return 'missing_key'
  return 'unknown'
}

function mediaOutput(data: Record<string, unknown>): string | null {
  for (const key of ['output', 'text', 'imageUrl', 'imageBase64', 'videoUrl', 'audioUrl', 'musicUrl', 'storageUrl']) {
    const value = data[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return null
}

function mediaResponse(
  request: CapabilityRequest,
  response: Response,
  data: Record<string, unknown>,
  outputType: string,
): CapabilityResponse {
  const executed = data.executed === true || data.success === true
  const output = mediaOutput(data)
  const jobId = typeof data.jobId === 'string' ? data.jobId : undefined
  return {
    success: response.ok && (executed || Boolean(output) || Boolean(jobId)),
    capability: request.capability ?? String(data.capability ?? 'unknown'),
    provider: typeof data.provider === 'string' ? data.provider : null,
    model: typeof data.model === 'string' ? data.model : null,
    outputType,
    output,
    ...(jobId ? { jobId } : {}),
    status: typeof data.status === 'string' ? data.status as CapabilityResponse['status'] : undefined,
    artifactId: typeof data.artifactId === 'string' ? data.artifactId : undefined,
    fallbackUsed: data.fallbackUsed === true,
    error: typeof data.error === 'string' ? data.error : undefined,
    error_category: response.ok ? undefined : routeStatus(response, data),
    providerAttempts: Array.isArray(data.attempts)
      ? data.attempts as CapabilityResponse['providerAttempts']
      : undefined,
    metadata: { response: data },
  }
}

function blockedAdultVideoResponse(): CapabilityResponse {
  const blocker = 'Adult video requires a dedicated Hugging Face adult video endpoint/model. Configure HF_ADULT_VIDEO_ENDPOINT or HF_ADULT_VIDEO_ENDPOINT_FALLBACK plus HF_ADULT_VIDEO_MODEL or HF_ADULT_VIDEO_MODEL_FALLBACK; generic video generation is not used for adult_video.'
  return {
    success: false,
    capability: 'adult_video',
    provider: null,
    model: null,
    outputType: 'video',
    output: null,
    status: 'failed',
    fallbackUsed: false,
    error: blocker,
    error_category: 'model_not_supported',
    providerAttempts: [
      {
        provider: 'huggingface',
        model: process.env.HF_ADULT_VIDEO_MODEL?.trim() || process.env.HF_ADULT_VIDEO_MODEL_FALLBACK?.trim() || 'HF_ADULT_VIDEO_MODEL',
        status: 'needs_endpoint',
        error: blocker,
      },
    ],
    metadata: {
      blocker,
      nextAction: 'Configure and prove a dedicated Hugging Face adult video endpoint before enabling adult_video execution.',
      requiredEnv: [
        'HF_ADULT_VIDEO_ENDPOINT',
        'HF_ADULT_VIDEO_ENDPOINT_FALLBACK',
        'HF_ADULT_VIDEO_MODEL',
        'HF_ADULT_VIDEO_MODEL_FALLBACK',
      ],
    },
  }
}

export async function executeCapability(request: CapabilityRequest): Promise<CapabilityResponse> {
  const capability = request.capability ?? 'chat'
  if (TEXT_CAPABILITIES.has(capability)) return executeText(request)

  if (capability === 'image_generation' || capability === 'image') {
    const response = await imagePost(jsonRequest('/api/brain/image', {
      prompt: request.input,
      appSlug: request.appId,
      providerOverride: request.providerOverride,
      modelOverride: request.modelOverride,
      costMode: costModeFrom(request.metadata),
      capability: 'image_generation',
    }))
    return mediaResponse(request, response, await readJson(response), 'image')
  }

  if (capability === 'adult_video') {
    return blockedAdultVideoResponse()
  }

  if (capability === 'video_generation' || capability === 'image_to_video') {
    const response = await videoPost(jsonRequest('/api/brain/video-generate', {
      prompt: request.input,
      appSlug: request.appId,
      provider: request.providerOverride ?? 'auto',
      model: request.modelOverride,
      costMode: costModeFrom(request.metadata),
      capability,
      referenceImageUrl: typeof request.metadata?.referenceImageUrl === 'string' ? request.metadata.referenceImageUrl : undefined,
    }))
    return mediaResponse(request, response, await readJson(response), 'video')
  }

  if (capability === 'tts' || capability === 'adult_voice' || capability === 'voice_response') {
    const response = await ttsPost(jsonRequest('/api/brain/tts', {
      text: request.input,
      appSlug: request.appId,
      provider: request.providerOverride ?? 'auto',
      model: request.modelOverride,
      capability: capability === 'voice_response' ? 'tts' : capability,
    }))
    return mediaResponse(request, response, await readJson(response), 'audio')
  }

  if (capability === 'adult_text') {
    const response = await adultTextPost(jsonRequest('/api/brain/adult-text', {
      prompt: request.input,
      appSlug: request.appId,
      provider: request.providerOverride,
      model: request.modelOverride,
    }))
    return mediaResponse(request, response, await readJson(response), 'text')
  }

  if (capability === 'adult_image') {
    const response = await adultImagePost(jsonRequest('/api/brain/adult-image', {
      prompt: request.input,
      appSlug: request.appId,
      provider: request.providerOverride,
      model: request.modelOverride,
    }))
    return mediaResponse(request, response, await readJson(response), 'image')
  }

  if (capability === 'music_generation') {
    const response = await musicPost(jsonRequest('/api/admin/music-studio', {
      action: 'create_async',
      request: {
        appSlug: request.appId ?? 'runtime',
        theme: request.input,
        genre: 'cinematic',
        vocalStyle: 'instrumental_only',
        prompt: request.input,
      },
    }))
    return mediaResponse(request, response, await readJson(response), 'audio')
  }

  return {
    success: false,
    capability,
    provider: null,
    model: null,
    outputType: 'text',
    output: null,
    fallbackUsed: false,
    error: `Capability is not executable through canonical runtime routes: ${capability}`,
    error_category: 'model_not_supported',
  }
}
