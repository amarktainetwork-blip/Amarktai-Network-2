import { callUniversalProvider } from '@/lib/universal-provider-call'
import { callGenXMedia, getGenXJobStatus } from '@/lib/genx-client'
import { getVaultApiKey } from '@/lib/brain'
import { resolveHfSpecialistConfig } from '@/lib/hf-specialist-config'
import type {
  AiCapabilityDefinition,
  AiCapabilityProviderRoute,
} from '@/lib/ai-capability-taxonomy'
import type { ApprovedDirectProviderId } from '@/lib/provider-mesh'
import { sanitizeProviderError } from '@/lib/provider-mesh'
import {
  getVideoModelContract,
  providerSafeVideoParameters,
} from '@/lib/video-route-specs'
import { resolveProviderEndpoint } from '@/lib/providers/provider-discovery'
import { getProviderTruth } from '@/lib/providers/registry'

export type CapabilityReferenceKind =
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'tabular'
  | 'brand_kit'
  | 'app_context'

export interface CapabilityReference {
  kind: CapabilityReferenceKind
  url?: string
  artifactId?: string
  mimeType?: string
  data?: unknown
}

export interface CapabilityAdapterInput {
  capability: AiCapabilityDefinition
  route: AiCapabilityProviderRoute
  prompt: string
  text?: string
  inputs?: Record<string, unknown>
  references: CapabilityReference[]
  context: Record<string, unknown>
  model?: string
  endpointUrl?: string
}

export type CapabilityAdapterStatus =
  | 'completed'
  | 'processing'
  | 'needs_configuration'
  | 'blocked'
  | 'failed'

export interface CapabilityAdapterResult {
  status: CapabilityAdapterStatus
  provider: ApprovedDirectProviderId
  model: string
  output: unknown | null
  mediaUrl: string | null
  bytes: Buffer | null
  contentType: string | null
  providerJobId: string | null
  latencyMs: number
  rawStatus: number | null
  error: string | null
  errorCategory: ProviderErrorCategory | null
  retryable: boolean
  diagnostics: Record<string, unknown> | null
}

export type ProviderErrorCategory =
  | 'missing_key'
  | 'invalid_key'
  | 'model_not_supported'
  | 'region_mismatch'
  | 'provider_misconfigured'
  | 'provider_busy'
  | 'rate_limited'
  | 'timeout'
  | 'server_error'
  | 'malformed_response'
  | 'unsupported_endpoint'
  | 'duration_limited'
  | 'artifact_error'
  | 'unknown'

export interface ProviderCapabilityAdapter {
  id: string
  provider: ApprovedDirectProviderId
  categories: readonly string[]
  execute(input: CapabilityAdapterInput): Promise<CapabilityAdapterResult>
  poll?(providerJobId: string, input: CapabilityAdapterInput): Promise<CapabilityAdapterResult>
}

const PROVIDER_CATEGORIES: Record<ApprovedDirectProviderId, readonly string[]> = {
  genx: ['text', 'multimodal', 'computer_vision', 'video', 'audio', 'music', 'avatar_voice', 'agents_or_planning'],
  huggingface: ['text', 'multimodal', 'computer_vision', 'video', 'audio', 'music', 'avatar_voice', 'tabular', 'experimental'],
  mimo: ['text', 'multimodal', 'video', 'audio', 'agents_or_planning'],
  groq: ['text', 'multimodal', 'audio', 'agents_or_planning'],
  together: ['text', 'multimodal', 'computer_vision', 'video', 'audio', 'agents_or_planning'],
}

const GENX_MUSIC_DURATION_LIMIT_SECONDS = 30
const TOGETHER_VIDEO_RUNTIME_FLAG = 'TOGETHER_VIDEO_RUNTIME_ENABLED'
const TOGETHER_VIDEO_RUNTIME_DISABLED_ERROR =
  'Together video runtime is disabled until the /videos endpoint is live-proven after the VPS HTTP 404 contract failure. Set TOGETHER_VIDEO_RUNTIME_ENABLED=true to enable manual execution.'

function togetherVideoRuntimeEnabled() {
  return process.env[TOGETHER_VIDEO_RUNTIME_FLAG]?.trim().toLowerCase() === 'true'
}

function result(
  provider: ApprovedDirectProviderId,
  model: string,
  status: CapabilityAdapterStatus,
  values: Partial<Omit<CapabilityAdapterResult, 'provider' | 'model' | 'status'>> = {},
): CapabilityAdapterResult {
  return {
    provider,
    model,
    status,
    output: values.output ?? null,
    mediaUrl: values.mediaUrl ?? null,
    bytes: values.bytes ?? null,
    contentType: values.contentType ?? null,
    providerJobId: values.providerJobId ?? null,
    latencyMs: values.latencyMs ?? 0,
    rawStatus: values.rawStatus ?? null,
    error: values.error ? sanitizeProviderError(values.error) : null,
    errorCategory: values.errorCategory ?? null,
    retryable: values.retryable ?? false,
    diagnostics: values.diagnostics ?? null,
  }
}

export function classifyProviderError(input: {
  status?: number | null
  error?: unknown
  provider?: ApprovedDirectProviderId
}): { category: ProviderErrorCategory; retryable: boolean; message: string } {
  const status = input.status ?? null
  const message = sanitizeProviderError(input.error)
  const normalized = message.toLowerCase()
  if (/not configured|no api key|missing .*key/.test(normalized)) {
    return { category: 'missing_key', retryable: true, message }
  }
  if (status === 401 || status === 403 || /invalid.*(key|credential)|unauthori[sz]ed/.test(normalized)) {
    return { category: 'invalid_key', retryable: true, message }
  }
  if (
    /model.*(not found|does not exist|not supported|invalid)|invalid.*model|unsupported.*model/.test(normalized)
  ) {
    return { category: 'model_not_supported', retryable: true, message }
  }
  if (/region|workspace.*location|endpoint.*location/.test(normalized)) {
    return { category: 'region_mismatch', retryable: true, message }
  }
  if (status === 429 || /rate.?limit|too many requests/.test(normalized)) {
    return { category: 'rate_limited', retryable: true, message }
  }
  if (status === 503 || /loading|busy|temporarily unavailable|warming/.test(normalized)) {
    return { category: 'provider_busy', retryable: true, message }
  }
  if (status && status >= 500) {
    return { category: 'server_error', retryable: true, message }
  }
  if (/timeout|timed out|aborted/.test(normalized)) {
    return { category: 'timeout', retryable: true, message }
  }
  if (/duration|seconds?.*exceeds|exceeds.*seconds?|too long/.test(normalized)) {
    return { category: 'duration_limited', retryable: true, message }
  }
  if (/endpoint|not implemented|unsupported route/.test(normalized)) {
    return { category: 'unsupported_endpoint', retryable: true, message }
  }
  if (/base url|misconfigured|configuration/.test(normalized)) {
    return { category: 'provider_misconfigured', retryable: true, message }
  }
  if (/without .*data|malformed|invalid response|empty response/.test(normalized)) {
    return { category: 'malformed_response', retryable: true, message }
  }
  return { category: 'unknown', retryable: true, message }
}

function failedResult(
  provider: ApprovedDirectProviderId,
  model: string,
  error: unknown,
  status?: number | null,
): CapabilityAdapterResult {
  const classified = classifyProviderError({ status, error, provider })
  return result(provider, model, classified.category === 'missing_key' ? 'needs_configuration' : 'failed', {
    error: classified.message,
    errorCategory: classified.category,
    retryable: classified.retryable,
    rawStatus: status ?? null,
  })
}

function firstReference(input: CapabilityAdapterInput, kinds: CapabilityReferenceKind[]) {
  return input.references.find((reference) => kinds.includes(reference.kind))
}

function publicHttpsUrl(value?: string): string | null {
  if (!value) return null
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'https:') return null
    const host = parsed.hostname.toLowerCase()
    if (
      host === 'localhost'
      || host === '0.0.0.0'
      || host.startsWith('127.')
      || host.startsWith('10.')
      || host.startsWith('192.168.')
      || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) return null
    return parsed.toString()
  } catch {
    return null
  }
}

function structuredPrompt(input: CapabilityAdapterInput): string {
  return [
    `Capability: ${input.capability.id}`,
    input.prompt || input.text || '',
    Object.keys(input.context).length ? `App context: ${JSON.stringify(input.context)}` : '',
    input.references.length ? `References: ${JSON.stringify(input.references)}` : '',
    Object.keys(input.inputs ?? {}).length ? `Inputs: ${JSON.stringify(input.inputs)}` : '',
    'Return only the requested result. Use JSON when the output is structured.',
  ].filter(Boolean).join('\n\n')
}

async function executeText(input: CapabilityAdapterInput): Promise<CapabilityAdapterResult> {
  if (input.route.provider === 'huggingface') return executeHuggingFace(input)
  const model = input.model
  if (!model) return failedResult(input.route.provider, '', 'Discovery did not select a text model.')
  const response = await callUniversalProvider({
    providerKey: input.route.provider,
    model,
    message: structuredPrompt(input),
    systemPrompt: 'Execute the requested capability faithfully. Never claim an external action or generated file unless the response contains it.',
    temperature: 0.2,
    maxTokens: 2400,
  })
  if (!response.ok) {
    return failedResult(input.route.provider, response.model, response.error)
  }
  return result(input.route.provider, response.model, 'completed', {
    output: parseProviderJson(response.output),
    contentType: 'application/json',
  })
}

function parseProviderJson(value: string | null): unknown {
  if (!value) return null
  const trimmed = value.trim().replace(/^```json\s*/i, '').replace(/\s*```$/, '')
  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

async function executeHuggingFace(input: CapabilityAdapterInput): Promise<CapabilityAdapterResult> {
  const provider = 'huggingface' as const
  const key = await getVaultApiKey(provider)
  const specialist = resolveHfSpecialistConfig(input.capability.id, input.route)
  const model = input.model
  if (!model) return failedResult(provider, '', 'Discovery did not select a Hugging Face model.')
  if (!key) return failedResult(provider, model, 'Hugging Face key not configured.')
  const endpoint = specialist.endpointSource === 'environment'
    ? specialist.endpoint
    : !specialist.endpointRequired
      ? `${resolveProviderEndpoint(getProviderTruth(provider)!, 'inference_router')}/hf-inference/models/${model}`
      : null
  if (!endpoint) {
    return result(provider, model, 'needs_configuration', {
      error: `${input.capability.id} requires a Hugging Face specialist endpoint. Set ${specialist.requiredEnv.join(' or ')}; optional model override HF_MODEL_${input.capability.id.toUpperCase().replace(/[^A-Z0-9]+/g, '_')} or HF_SPECIALIST_MODELS_JSON.`,
      errorCategory: 'provider_misconfigured',
      retryable: true,
      diagnostics: {
        endpointRequired: specialist.endpointRequired,
        requiredEnv: specialist.requiredEnv,
        modelSource: specialist.modelSource,
        endpointSource: specialist.endpointSource,
      },
    })
  }

  const binaryReference = firstReference(input, ['image', 'audio', 'video', 'document'])
  let body: BodyInit
  let contentType = 'application/json'
  if (binaryReference?.data !== undefined && !['document_question_answering', 'visual_question_answering'].includes(input.capability.id)) {
    body = Uint8Array.from(referenceBytes(binaryReference.data))
    contentType = binaryReference.mimeType ?? 'application/octet-stream'
  } else if (binaryReference?.url && !['document_question_answering', 'visual_question_answering'].includes(input.capability.id)) {
    const referenceUrl = publicHttpsUrl(binaryReference.url)
    if (!referenceUrl) return result(provider, model, 'blocked', { error: 'Reference URLs must be public HTTPS URLs.' })
    const source = await fetch(referenceUrl, { signal: AbortSignal.timeout(30_000) }).catch(() => null)
    if (!source?.ok) return result(provider, model, 'failed', { error: 'Unable to fetch the provider input reference.' })
    body = Buffer.from(await source.arrayBuffer())
    contentType = binaryReference.mimeType ?? source.headers.get('content-type') ?? 'application/octet-stream'
  } else {
    body = JSON.stringify({
      inputs: huggingFaceInputs(input),
      parameters: input.inputs?.parameters ?? {},
    })
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': contentType },
      body,
      signal: AbortSignal.timeout(input.capability.longRunning ? 120_000 : 45_000),
    })
    const responseType = response.headers.get('content-type') ?? 'application/octet-stream'
    if (!response.ok) {
      return failedResult(
        provider,
        model,
        `Hugging Face HTTP ${response.status}: ${(await response.text().catch(() => '')).slice(0, 600)}`,
        response.status,
      )
    }
    if (responseType.includes('application/json')) {
      const json = await response.json().catch(() => null)
      const media = mediaFromJsonOutput(json)
      if (media) {
        return result(provider, model, 'completed', {
          output: json,
          mediaUrl: media.url,
          bytes: media.bytes,
          contentType: media.contentType ?? responseType,
        })
      }
      if (input.capability.id === 'music_generation') {
        return failedResult(
          provider,
          model,
          'Hugging Face music endpoint completed without audio bytes or audio URL.',
          response.status,
        )
      }
      return result(provider, model, 'completed', {
        output: json,
        contentType: responseType,
      })
    }
    return result(provider, model, 'completed', {
      bytes: Buffer.from(await response.arrayBuffer()),
      contentType: responseType,
    })
  } catch (error) {
    return failedResult(provider, model, error instanceof Error ? error.message : 'Hugging Face inference failed.')
  }
}

function huggingFaceInputs(input: CapabilityAdapterInput): unknown {
  const reference = firstReference(input, ['image', 'audio', 'video', 'document', 'tabular'])
  if (input.capability.id === 'question_answering') {
    return { question: input.prompt, context: String(input.inputs?.context ?? input.text ?? '') }
  }
  if (input.capability.id === 'table_question_answering') {
    return { query: input.prompt, table: input.inputs?.table ?? reference?.data ?? {} }
  }
  if (['sentence_similarity', 'text_ranking', 'rerank'].includes(input.capability.id)) {
    return {
      source_sentence: input.prompt,
      sentences: input.inputs?.documents ?? input.inputs?.sentences ?? [],
    }
  }
  if (input.capability.id === 'zero_shot_classification') {
    return input.text ?? input.prompt
  }
  if (reference?.url) return { question: input.prompt, image: reference.url, document: reference.url }
  if (reference?.data !== undefined) return reference.data
  return input.text ?? input.prompt
}

async function executeGenXMedia(input: CapabilityAdapterInput): Promise<CapabilityAdapterResult> {
  const provider = 'genx' as const
  const type = input.capability.group === 'video' || input.capability.id === 'avatar_video'
    ? 'video'
    : input.capability.group === 'computer_vision'
      || input.capability.outputTypes.includes('image')
      || input.capability.outputTypes.includes('avatar')
      ? 'image'
      : 'audio'
  const model = input.model
  if (!model) return failedResult(provider, '', 'Discovery did not select a GenX media model.')
  const requestedMusicDuration = input.capability.id === 'music_generation'
    ? numericInput(input.inputs?.durationSeconds ?? input.inputs?.duration)
    : null
  if (requestedMusicDuration && requestedMusicDuration > GENX_MUSIC_DURATION_LIMIT_SECONDS) {
    return result(provider, model, 'failed', {
      error: `Requested music duration ${requestedMusicDuration}s exceeds ${provider}/${model} limit ${GENX_MUSIC_DURATION_LIMIT_SECONDS}s.`,
      errorCategory: 'duration_limited',
      retryable: true,
      diagnostics: {
        requestedDurationSeconds: requestedMusicDuration,
        providerLimitSeconds: GENX_MUSIC_DURATION_LIMIT_SECONDS,
      },
    })
  }
  const videoContract = type === 'video' ? getVideoModelContract(provider, model) : null
  if (type === 'video' && !videoContract) {
    return result(provider, model, 'failed', {
      error: `No provider-safe video contract is registered for ${provider}/${model}.`,
      errorCategory: 'model_not_supported',
      retryable: true,
    })
  }
  const generated = await callGenXMedia({
    model,
    prompt: structuredPrompt(input),
    type,
    duration: requestedMusicDuration ?? numericInput(input.inputs?.duration) ?? undefined,
    params: {
      references: input.references,
      capability: input.capability.id,
      inputs: type === 'video' ? providerSafeVideoParameters(videoContract!, input.inputs ?? {}) : input.inputs,
    },
    metadata: { capability: input.capability.id },
  })
  if (!generated.success) {
    return failedResult(provider, generated.model, generated.error)
  }
  if (type === 'audio' && !generated.url && !generated.bytes && !generated.jobId) {
    const noAudioError = 'Provider returned no audio bytes, audio URL, or pollable audio job.'
    return failedResult(
      provider,
      generated.model,
      generated.error ? `${noAudioError} Provider message: ${generated.error}` : noAudioError,
    )
  }
  return result(provider, generated.model, generated.jobId ? 'processing' : 'completed', {
    mediaUrl: generated.url,
    bytes: generated.bytes,
    providerJobId: generated.jobId,
    contentType: generated.contentType ?? (
      type === 'video' ? 'video/mp4' : type === 'image' ? 'image/png' : 'audio/mpeg'
    ),
    diagnostics: {
      requestedDurationSeconds: requestedMusicDuration,
      providerLimitSeconds: type === 'audio' ? GENX_MUSIC_DURATION_LIMIT_SECONDS : null,
    },
  })
}

function numericInput(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return null
}

async function executeTogetherImage(input: CapabilityAdapterInput): Promise<CapabilityAdapterResult> {
  const provider = 'together' as const
  const key = await getVaultApiKey(provider)
  const model = input.model
  if (!model) return failedResult(provider, '', 'Discovery did not select a Together image model.')
  if (!key) return failedResult(provider, model, 'Together AI key not configured.')
  const endpoint = `${resolveProviderEndpoint(getProviderTruth(provider)!, 'openai_compatible')}/images/generations`
  const reference = firstReference(input, ['image'])
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: input.prompt,
        ...(reference?.url ? { image_url: reference.url } : {}),
        ...(input.inputs ?? {}),
      }),
      signal: AbortSignal.timeout(90_000),
    })
    const json = await response.json().catch(() => null)
    if (!response.ok) {
      return failedResult(
        provider,
        model,
        `Together image HTTP ${response.status}: ${JSON.stringify(json).slice(0, 600)}`,
        response.status,
      )
    }
    const mediaUrl = nestedString(json, ['data', '0', 'url'])
    const base64 = nestedString(json, ['data', '0', 'b64_json'])
    if (!mediaUrl && !base64) {
      return failedResult(provider, model, 'Together completed without image data.', response.status)
    }
    return result(provider, model, 'completed', {
      output: json,
      mediaUrl,
      bytes: base64 ? Buffer.from(base64, 'base64') : null,
      contentType: 'image/png',
    })
  } catch (error) {
    return failedResult(provider, model, error instanceof Error ? error.message : 'Together image execution failed.')
  }
}

function nestedString(value: unknown, path: string[]): string | null {
  let cursor: unknown = value
  for (const key of path) {
    if (Array.isArray(cursor)) cursor = cursor[Number(key)]
    else if (cursor && typeof cursor === 'object') cursor = (cursor as Record<string, unknown>)[key]
    else return null
  }
  return typeof cursor === 'string' && cursor.trim() ? cursor.trim() : null
}

function mediaFromJsonOutput(value: unknown): {
  url: string | null
  bytes: Buffer | null
  contentType: string | null
} | null {
  const url = [
    ['audioUrl'],
    ['audio_url'],
    ['musicUrl'],
    ['music_url'],
    ['downloadUrl'],
    ['download_url'],
    ['image'],
    ['image_url'],
    ['img_url'],
    ['video_url'],
    ['url'],
    ['audio', 'url'],
    ['music', 'url'],
    ['output', 'url'],
    ['output', 'image'],
    ['output', 'image_url'],
    ['output', 'img_url'],
    ['output', 'video_url'],
    ['output', 'results', '0', 'url'],
    ['output', 'results', '0', 'image_url'],
    ['output', 'results', '0', 'video_url'],
    ['output', 'task_results', '0', 'url'],
    ['output', 'task_results', '0', 'image_url'],
    ['output', 'task_results', '0', 'video_url'],
    ['output', 'choices', '0', 'message', 'content', '0', 'image'],
    ['output', 'choices', '0', 'message', 'content', '0', 'image_url'],
    ['outputs', 'video_url'],
    ['result', 'url'],
    ['result', 'image_url'],
    ['result', 'video_url'],
    ['data', '0', 'url'],
    ['data', '0', 'image_url'],
    ['data', '0', 'video_url'],
  ].map((path) => nestedString(value, path)).find((candidate) => publicHttpsUrl(candidate ?? undefined))
  if (url) return { url, bytes: null, contentType: null }

  const encoded = [
    ['audioBase64'],
    ['audio_base64'],
    ['audio', 'base64'],
    ['music', 'base64'],
    ['base64'],
    ['b64_json'],
    ['data', '0', 'b64_json'],
    ['data'],
  ].map((path) => nestedString(value, path)).find(Boolean)
  if (!encoded) return null
  const dataUri = encoded.match(/^data:([^;,]+);base64,(.+)$/i)
  if (dataUri) {
    return {
      url: null,
      bytes: Buffer.from(dataUri[2], 'base64'),
      contentType: dataUri[1],
    }
  }
  return {
    url: null,
    bytes: Buffer.from(encoded, 'base64'),
    contentType: nestedString(value, ['contentType']) ?? nestedString(value, ['mimeType']) ?? null,
  }
}

async function executeGroqAudio(input: CapabilityAdapterInput): Promise<CapabilityAdapterResult> {
  const provider = 'groq' as const
  const key = await getVaultApiKey(provider)
  const isStt = input.capability.id === 'automatic_speech_recognition'
  const model = input.model
  if (!model) return failedResult(provider, '', 'Discovery did not select a Groq audio model.')
  if (!key) return failedResult(provider, model, 'Groq key not configured.')
  try {
    if (isStt) {
      const audio = firstReference(input, ['audio'])
      let audioBytes: Buffer
      if (audio?.data !== undefined) {
        audioBytes = referenceBytes(audio.data)
      } else {
        const url = publicHttpsUrl(audio?.url)
        if (!url) return result(provider, model, 'blocked', { error: 'Speech recognition requires audio bytes or a public HTTPS audio reference.' })
        const source = await fetch(url, { signal: AbortSignal.timeout(30_000) })
        if (!source.ok) return result(provider, model, 'failed', { error: `Audio fetch failed (${source.status}).` })
        audioBytes = Buffer.from(await source.arrayBuffer())
      }
      const form = new FormData()
      form.append('model', model)
      form.append('file', new Blob([Uint8Array.from(audioBytes)], { type: audio?.mimeType ?? 'audio/mpeg' }), 'audio-input')
      const response = await fetch(`${resolveProviderEndpoint(getProviderTruth(provider)!, 'openai_compatible')}/audio/transcriptions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}` },
        body: form,
        signal: AbortSignal.timeout(60_000),
      })
      if (!response.ok) return failedResult(provider, model, `Groq STT HTTP ${response.status}.`, response.status)
      return result(provider, model, 'completed', {
        output: await response.json().catch(() => null),
        contentType: 'application/json',
      })
    }
    const response = await fetch(`${resolveProviderEndpoint(getProviderTruth(provider)!, 'openai_compatible')}/audio/speech`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        input: input.text ?? input.prompt,
        voice: String(input.inputs?.voice ?? 'troy'),
        response_format: 'wav',
      }),
      signal: AbortSignal.timeout(60_000),
    })
    if (!response.ok) return failedResult(provider, model, `Groq TTS HTTP ${response.status}.`, response.status)
    return result(provider, model, 'completed', {
      bytes: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get('content-type') ?? 'audio/wav',
    })
  } catch (error) {
    return failedResult(provider, model, error instanceof Error ? error.message : 'Groq audio execution failed.')
  }
}

function referenceBytes(value: unknown): Buffer {
  if (Buffer.isBuffer(value)) return value
  if (value instanceof Uint8Array) return Buffer.from(value)
  if (value instanceof ArrayBuffer) return Buffer.from(value)
  if (typeof value === 'string') return Buffer.from(value, 'base64')
  throw new Error('Unsupported inline reference data.')
}

async function referenceAudioDataUri(reference: CapabilityReference): Promise<string | null> {
  const mimeType = reference.mimeType ?? 'audio/wav'
  if (reference.data !== undefined) {
    return `data:${mimeType};base64,${referenceBytes(reference.data).toString('base64')}`
  }
  const url = publicHttpsUrl(reference.url)
  if (!url) return null
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (!response.ok) return null
  const bytes = Buffer.from(await response.arrayBuffer())
  return `data:${response.headers.get('content-type') ?? mimeType};base64,${bytes.toString('base64')}`
}

async function executeTogetherTts(input: CapabilityAdapterInput): Promise<CapabilityAdapterResult> {
  const provider = 'together' as const
  const key = await getVaultApiKey(provider)
  const model = input.model
  if (!model) return failedResult(provider, '', 'Discovery did not select a TTS model.')
  if (!key) return failedResult(provider, model, 'Together AI key not configured.')
  const truth = getProviderTruth(provider)!
  try {
    const response = await fetch(`${resolveProviderEndpoint(truth, 'openai_compatible')}/audio/speech`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        input: input.text ?? input.prompt,
        voice: input.inputs?.voice,
        response_format: input.inputs?.format ?? 'mp3',
      }),
      signal: AbortSignal.timeout(60_000),
    })
    if (!response.ok) return failedResult(provider, model, `Together TTS HTTP ${response.status}.`, response.status)
    return result(provider, model, 'completed', {
      bytes: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get('content-type') ?? 'audio/mpeg',
    })
  } catch (error) {
    return failedResult(provider, model, error instanceof Error ? error.message : 'Together TTS failed.')
  }
}

async function executeTogetherStt(input: CapabilityAdapterInput): Promise<CapabilityAdapterResult> {
  const provider = 'together' as const
  const key = await getVaultApiKey(provider)
  const model = input.model
  if (!model) return failedResult(provider, '', 'Discovery did not select a Together STT model.')
  if (!key) return failedResult(provider, model, 'Together AI key not configured.')
  const audio = firstReference(input, ['audio'])
  if (!audio) return result(provider, model, 'blocked', { error: 'Speech recognition requires audio input.' })
  try {
    const form = new FormData()
    form.append('model', model)
    if (audio.data !== undefined) {
      form.append(
        'file',
        new Blob([Uint8Array.from(referenceBytes(audio.data))], { type: audio.mimeType ?? 'audio/mpeg' }),
        'audio-input',
      )
    } else {
      const url = publicHttpsUrl(audio.url)
      if (!url) return result(provider, model, 'blocked', { error: 'Audio reference must be a public HTTPS URL.' })
      form.append('file', url)
    }
    const response = await fetch(`${resolveProviderEndpoint(getProviderTruth(provider)!, 'openai_compatible')}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
      signal: AbortSignal.timeout(90_000),
    })
    const json = await response.json().catch(() => null)
    if (!response.ok) {
      return failedResult(provider, model, `Together STT HTTP ${response.status}: ${JSON.stringify(json).slice(0, 600)}`, response.status)
    }
    return result(provider, model, 'completed', { output: json, contentType: 'application/json' })
  } catch (error) {
    return failedResult(provider, model, error instanceof Error ? error.message : 'Together STT failed.')
  }
}

async function executeTogetherData(input: CapabilityAdapterInput): Promise<CapabilityAdapterResult> {
  const provider = 'together' as const
  const key = await getVaultApiKey(provider)
  const model = input.model
  if (!model) return failedResult(provider, '', 'Discovery did not select a Together data model.')
  if (!key) return failedResult(provider, model, 'Together AI key not configured.')
  const rerank = ['rerank', 'text_ranking'].includes(input.capability.id)
  const endpoint = `${resolveProviderEndpoint(getProviderTruth(provider)!, 'openai_compatible')}/${rerank ? 'rerank' : 'embeddings'}`
  const body = rerank
    ? {
        model,
        query: input.prompt,
        documents: input.inputs?.documents ?? input.inputs?.sentences ?? [],
      }
    : {
        model,
        input: input.inputs?.input ?? input.text ?? input.prompt,
      }
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45_000),
    })
    const json = await response.json().catch(() => null)
    if (!response.ok) {
      return failedResult(provider, model, `Together ${rerank ? 'rerank' : 'embeddings'} HTTP ${response.status}: ${JSON.stringify(json).slice(0, 600)}`, response.status)
    }
    return result(provider, model, 'completed', { output: json, contentType: 'application/json' })
  } catch (error) {
    return failedResult(provider, model, error instanceof Error ? error.message : 'Together data execution failed.')
  }
}

async function executeTogetherVideo(input: CapabilityAdapterInput): Promise<CapabilityAdapterResult> {
  const provider = 'together' as const
  const model = input.model
  if (!model) return failedResult(provider, '', 'Discovery did not select a Together video model.')
  if (!togetherVideoRuntimeEnabled()) {
    return result(provider, model, 'failed', {
      error: TOGETHER_VIDEO_RUNTIME_DISABLED_ERROR,
      errorCategory: 'unsupported_endpoint',
      retryable: true,
    })
  }
  const key = await getVaultApiKey(provider)
  if (!key) return failedResult(provider, model, 'Together AI key not configured.')
  const baseUrl = resolveProviderEndpoint(getProviderTruth(provider)!, 'video')
  const requestedSeconds = numericInput(input.inputs?.durationSeconds ?? input.inputs?.duration)
  const body = {
    model,
    prompt: input.prompt,
    ...(input.inputs?.aspectRatio ? { ratio: input.inputs.aspectRatio } : {}),
    ...(input.inputs?.resolution ? { resolution: input.inputs.resolution } : {}),
    ...(requestedSeconds ? { seconds: String(requestedSeconds) } : {}),
  }
  try {
    const response = await fetch(`${baseUrl}/videos`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45_000),
    })
    const json = await response.json().catch(() => null)
    if (!response.ok) {
      return failedResult(provider, model, `Together video HTTP ${response.status}: ${JSON.stringify(json).slice(0, 600)}`, response.status)
    }
    const media = mediaFromJsonOutput(json)
    const jobId = nestedString(json, ['id'])
      ?? nestedString(json, ['job_id'])
      ?? nestedString(json, ['data', 'id'])
      ?? nestedString(json, ['video', 'id'])
    if (media) {
      return result(provider, model, 'completed', {
        output: json,
        mediaUrl: media.url,
        bytes: media.bytes,
        contentType: media.contentType ?? 'video/mp4',
        diagnostics: { requestedDurationSeconds: requestedSeconds },
      })
    }
    if (!jobId) {
      return failedResult(provider, model, 'Together video response did not include a job ID or media URL.', response.status)
    }
    return result(provider, model, 'processing', {
      output: json,
      providerJobId: jobId,
      contentType: 'application/json',
      diagnostics: { requestedDurationSeconds: requestedSeconds },
    })
  } catch (error) {
    return failedResult(provider, model, error instanceof Error ? error.message : 'Together video execution failed.')
  }
}

async function executeMimoTts(input: CapabilityAdapterInput): Promise<CapabilityAdapterResult> {
  const provider = 'mimo' as const
  const key = await getVaultApiKey(provider)
  const model = input.model
  if (!model) return failedResult(provider, '', 'Discovery did not select a TTS model.')
  if (!key) return failedResult(provider, model, 'MiMo key not configured.')
  const truth = getProviderTruth(provider)!
  try {
    const response = await fetch(`${resolveProviderEndpoint(truth, 'token_plan')}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'api-key': key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: input.text ?? input.prompt }],
        audio: {
          format: input.inputs?.format ?? 'wav',
          voice: input.inputs?.voice,
        },
      }),
      signal: AbortSignal.timeout(60_000),
    })
    const json = await response.json().catch(() => null) as {
      choices?: Array<{ message?: { audio?: { data?: string } } }>
    } | null
    if (!response.ok) return failedResult(provider, model, `MiMo TTS HTTP ${response.status}.`, response.status)
    const audio = json?.choices?.[0]?.message?.audio?.data
    if (!audio) return failedResult(provider, model, 'MiMo completed without audio data.')
    return result(provider, model, 'completed', {
      bytes: Buffer.from(audio, 'base64'),
      contentType: input.inputs?.format === 'mp3' ? 'audio/mpeg' : 'audio/wav',
    })
  } catch (error) {
    return failedResult(provider, model, error instanceof Error ? error.message : 'MiMo TTS failed.')
  }
}

async function executeMimoAsr(input: CapabilityAdapterInput): Promise<CapabilityAdapterResult> {
  const provider = 'mimo' as const
  const key = await getVaultApiKey(provider)
  const model = input.model
  if (!model) return failedResult(provider, '', 'Discovery did not select an ASR model.')
  if (!key) return failedResult(provider, model, 'MiMo key not configured.')
  const audio = firstReference(input, ['audio'])
  if (!audio) return result(provider, model, 'blocked', { error: 'MiMo ASR requires audio input.' })
  const truth = getProviderTruth(provider)!
  try {
    const audioData = await referenceAudioDataUri(audio)
    if (!audioData) return result(provider, model, 'blocked', { error: 'MiMo ASR requires inline audio bytes or a fetchable public HTTPS audio URL.' })
    const body = {
      model,
      messages: [{
        role: 'user',
        content: [{
          type: 'input_audio',
          input_audio: { data: audioData },
        }],
      }],
      asr_options: {
        language: input.inputs?.language ?? 'auto',
      },
    }
    const response = await fetch(`${resolveProviderEndpoint(truth, 'token_plan')}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'api-key': key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    })
    const json = await response.json().catch(() => null)
    if (!response.ok) return failedResult(provider, model, `MiMo ASR HTTP ${response.status}: ${JSON.stringify(json).slice(0, 600)}`, response.status)
    const transcript = nestedString(json, ['choices', '0', 'message', 'content'])
      ?? nestedString(json, ['text'])
    if (!transcript) return failedResult(provider, model, 'MiMo ASR completed without transcript text.', response.status)
    return result(provider, model, 'completed', {
      output: { text: transcript, raw: json },
      contentType: 'application/json',
    })
  } catch (error) {
    return failedResult(provider, model, error instanceof Error ? error.message : 'MiMo ASR failed.')
  }
}

async function adapterExecute(provider: ApprovedDirectProviderId, input: CapabilityAdapterInput) {
  const startedAt = Date.now()
  let execution: Promise<CapabilityAdapterResult>
  if (provider === 'huggingface') execution = executeHuggingFace(input)
  else if (provider === 'genx' && (
    input.capability.longRunning
    || ['computer_vision', 'video', 'audio', 'music', 'avatar_voice'].includes(input.capability.group)
  )) execution = executeGenXMedia(input)
  else if (provider === 'groq' && ['text_to_speech', 'automatic_speech_recognition'].includes(input.capability.id)) {
    execution = executeGroqAudio(input)
  }
  else if (provider === 'together' && input.capability.id === 'text_to_speech') {
    execution = executeTogetherTts(input)
  }
  else if (provider === 'together' && input.capability.id === 'automatic_speech_recognition') {
    execution = executeTogetherStt(input)
  }
  else if (provider === 'together' && ['embeddings', 'rerank', 'text_ranking'].includes(input.capability.id)) {
    execution = executeTogetherData(input)
  }
  else if (provider === 'together' && input.capability.group === 'video') {
    execution = executeTogetherVideo(input)
  }
  else if (provider === 'mimo' && input.capability.id === 'text_to_speech') {
    execution = executeMimoTts(input)
  }
  else if (provider === 'mimo' && input.capability.id === 'automatic_speech_recognition') {
    execution = executeMimoAsr(input)
  }
  else if (provider === 'together' && input.capability.outputTypes.includes('image')) {
    execution = executeTogetherImage(input)
  }
  else execution = executeText(input)
  const resolved = await execution
  return { ...resolved, latencyMs: Date.now() - startedAt }
}

async function pollProvider(
  provider: ApprovedDirectProviderId,
  providerJobId: string,
  input: CapabilityAdapterInput,
): Promise<CapabilityAdapterResult> {
  const model = input.model
  if (!model) return failedResult(provider, '', 'Discovery did not retain a model for provider polling.')
  if (provider === 'genx') {
    const polled = await getGenXJobStatus(providerJobId)
    if (!polled) return result(provider, model, 'processing', { providerJobId })
    if (polled.status === 'failed') return result(provider, model, 'failed', { providerJobId, error: polled.error ?? 'GenX job failed.' })
    if (!['completed', 'succeeded'].includes(polled.status)) return result(provider, model, 'processing', { providerJobId })
    if (input.capability.group === 'music' && !polled.resultUrl && !polled.bytes) {
      return result(provider, model, 'failed', {
        providerJobId,
        error: polled.error ?? 'GenX music job completed without audio bytes or audio URL.',
        errorCategory: 'malformed_response',
        retryable: true,
      })
    }
    return result(provider, model, 'completed', {
      providerJobId,
      mediaUrl: polled.resultUrl ?? null,
      bytes: polled.bytes ?? null,
      contentType: polled.contentType ?? null,
    })
  }
  if (provider === 'together') {
    const key = await getVaultApiKey(provider)
    if (!key) return failedResult(provider, model, 'Together AI key not configured.')
    try {
      const response = await fetch(`${resolveProviderEndpoint(getProviderTruth(provider)!, 'video')}/videos/${encodeURIComponent(providerJobId)}`, {
        headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(45_000),
      })
      const json = await response.json().catch(() => null)
      if (!response.ok) {
        return failedResult(provider, model, `Together video poll HTTP ${response.status}: ${JSON.stringify(json).slice(0, 600)}`, response.status)
      }
      const rawStatus = (
        nestedString(json, ['status'])
        ?? nestedString(json, ['state'])
        ?? nestedString(json, ['data', 'status'])
        ?? ''
      ).toLowerCase()
      if (['queued', 'pending', 'running', 'processing', 'in_progress'].includes(rawStatus)) {
        return result(provider, model, 'processing', { providerJobId, output: json })
      }
      if (['failed', 'error', 'cancelled', 'canceled'].includes(rawStatus)) {
        return result(provider, model, 'failed', {
          providerJobId,
          output: json,
          error: nestedString(json, ['error']) ?? nestedString(json, ['message']) ?? 'Together video job failed.',
        })
      }
      const media = mediaFromJsonOutput(json)
      if (!media) {
        return result(provider, model, 'failed', {
          providerJobId,
          output: json,
          error: 'Together video job completed without a media URL or bytes.',
          errorCategory: 'malformed_response',
          retryable: true,
        })
      }
      return result(provider, model, 'completed', {
        providerJobId,
        output: json,
        mediaUrl: media.url,
        bytes: media.bytes,
        contentType: media.contentType ?? 'video/mp4',
      })
    } catch (error) {
      return failedResult(provider, model, error instanceof Error ? error.message : 'Together video polling failed.')
    }
  }
  return result(provider, model, 'failed', {
    providerJobId,
    error: `Provider ${provider} does not expose a polling contract for this adapter.`,
  })
}

export function providerHasCanonicalPollingContract(provider: ApprovedDirectProviderId) {
  return ['genx', 'together'].includes(provider)
}

export const PROVIDER_CAPABILITY_ADAPTERS: readonly ProviderCapabilityAdapter[] =
  (Object.keys(PROVIDER_CATEGORIES) as ApprovedDirectProviderId[]).map((provider) => ({
    id: `${provider}_capability_adapter`,
    provider,
    categories: PROVIDER_CATEGORIES[provider],
    execute: (input) => adapterExecute(provider, input),
    poll: (providerJobId, input) => pollProvider(provider, providerJobId, input),
  }))

export function getProviderCapabilityAdapter(provider: ApprovedDirectProviderId) {
  return PROVIDER_CAPABILITY_ADAPTERS.find((adapter) => adapter.provider === provider) ?? null
}

export function countProviderAdapterRoutes() {
  return PROVIDER_CAPABILITY_ADAPTERS.reduce(
    (total, adapter) => total + adapter.categories.length,
    0,
  )
}
