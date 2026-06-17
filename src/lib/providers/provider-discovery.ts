import {
  GENX_AUDIO_MODELS,
  GENX_IMAGE_MODELS,
  GENX_TTS_MODELS,
  normalizeGenXBaseUrl,
} from '@/lib/genx-client'
import { getProviderKeyWithSource } from '@/lib/provider-config'
import { sanitizeProviderError } from '@/lib/provider-mesh'
import { VIDEO_MODEL_CONTRACTS } from '@/lib/video-route-specs'
import { ProviderDiscoveryCache } from './provider-cache'
import { PROVIDER_TRUTH } from './provider-truth'
import type {
  CapabilityId,
  DiscoveredModel,
  ProviderDiscoverySnapshot,
  ProviderId,
  ProviderTruthDefinition,
} from './provider-types'

const discoveryCache = new ProviderDiscoveryCache<ProviderDiscoverySnapshot>()

const HF_PIPELINE_TASK: Partial<Record<CapabilityId, string>> = {
  chat: 'text-generation',
  reasoning: 'text-generation',
  coding: 'text-generation',
  research: 'text-generation',
  image: 'text-to-image',
  image_edit: 'image-to-image',
  video: 'text-to-video',
  image_to_video: 'image-to-video',
  avatar: 'text-to-image',
  music: 'text-to-audio',
  tts: 'text-to-speech',
  stt: 'automatic-speech-recognition',
  ocr: 'image-to-text',
  vision: 'image-text-to-text',
  embeddings: 'feature-extraction',
  rerank: 'text-ranking',
  translation: 'translation',
  documents: 'document-question-answering',
  agents: 'text-generation',
  adult_text: 'text-generation',
  adult_image: 'text-to-image',
  adult_video: 'text-to-video',
}

const TASK_CAPABILITY_MAP: Readonly<Record<string, CapabilityId[]>> = {
  chat: ['chat'],
  reasoning: ['reasoning'],
  coding: ['coding'],
  research: ['research'],
  image: ['image'],
  image_edit: ['image_edit'],
  video: ['video'],
  image_to_video: ['image_to_video'],
  avatar: ['avatar'],
  music: ['music'],
  tts: ['tts'],
  stt: ['stt'],
  voice_clone: ['voice_clone'],
  ocr: ['ocr'],
  vision: ['vision'],
  embeddings: ['embeddings'],
  rerank: ['rerank'],
  documents: ['documents'],
  agents: ['agents'],
  conversational: ['chat'],
  'text-generation': ['chat', 'reasoning', 'coding'],
  'text2text-generation': ['chat', 'reasoning', 'translation'],
  'image-text-to-text': ['vision', 'ocr'],
  'image-to-text': ['vision', 'ocr'],
  'visual-question-answering': ['vision'],
  'document-question-answering': ['documents', 'ocr'],
  'text-to-image': ['image'],
  'image-to-image': ['image_edit'],
  'text-to-video': ['video'],
  'image-to-video': ['image_to_video'],
  'text-to-audio': ['music'],
  'text-to-speech': ['tts'],
  'automatic-speech-recognition': ['stt'],
  'feature-extraction': ['embeddings'],
  'sentence-similarity': ['embeddings'],
  'text-ranking': ['rerank'],
  translation: ['translation'],
  'tool-calling': ['agents'],
  'chat-completion': ['chat'],
  'chat-completions': ['chat'],
  instruct: ['chat'],
  llm: ['chat', 'reasoning', 'coding'],
  code: ['coding'],
  coder: ['coding'],
  multimodal: ['vision'],
  'image-generation': ['image'],
  'image-editing': ['image_edit'],
  'video-generation': ['video'],
  'speech-to-text': ['stt'],
  transcription: ['stt'],
  asr: ['stt'],
  'speech-generation': ['tts'],
  embedding: ['embeddings'],
  reranking: ['rerank'],
}

const GENX_FALLBACK_MODEL_CAPABILITIES: Partial<Record<CapabilityId, readonly string[]>> = {
  image: GENX_IMAGE_MODELS,
  video: VIDEO_MODEL_CONTRACTS
    .filter((contract) => contract.provider === 'genx' && contract.mode === 'text_to_video')
    .map((contract) => contract.model),
  music: GENX_AUDIO_MODELS,
  tts: GENX_TTS_MODELS,
}

type FetchLike = typeof fetch

export interface ProviderDiscoveryOptions {
  force?: boolean
  fetcher?: FetchLike
  credential?: string | null
  keySource?: string
  capability?: CapabilityId
}

export async function discoverProvider(
  providerId: ProviderId,
  options: ProviderDiscoveryOptions = {},
): Promise<ProviderDiscoverySnapshot> {
  const provider = PROVIDER_TRUTH.find((entry) => entry.id === providerId)
  if (!provider) throw new Error(`Unknown provider: ${providerId}`)
  const cacheKey = options.capability ? `${providerId}:${options.capability}` : providerId
  const cached = options.force ? null : discoveryCache.get(cacheKey)
  if (cached) return cached

  const credentialResult = options.credential !== undefined
    ? { key: options.credential, source: options.keySource ?? 'injected' }
    : await getProviderKeyWithSource(providerId)
  const publicDiscovery = providerId === 'huggingface'
  const now = new Date()
  const discoveredAt = now.toISOString()
  const expiresAt = new Date(now.getTime() + provider.discovery.cacheTtlMs)
  if (!credentialResult.key && !publicDiscovery) {
    return discoveryCache.set(cacheKey, {
      provider: providerId,
      status: 'not_configured',
      endpoint: resolveDiscoveryUrl(provider, options.capability),
      keySource: credentialResult.source,
      models: [],
      tasks: [],
      inferenceProviders: [],
      privateEndpoints: readEndpointEnv(provider.discovery.privateEndpointsEnv),
      dedicatedEndpoints: readEndpointEnv(provider.discovery.dedicatedEndpointsEnv),
      discoveredAt,
      expiresAt: expiresAt.toISOString(),
      error: 'Provider credential is not configured.',
    }, provider.discovery.cacheTtlMs)
  }

  const endpoint = resolveDiscoveryUrl(provider, options.capability)
  if (!endpoint) {
    return discoveryCache.set(cacheKey, {
      provider: providerId,
      status: 'failed',
      endpoint: null,
      keySource: credentialResult.source,
      models: [],
      tasks: [],
      inferenceProviders: [],
      privateEndpoints: readEndpointEnv(provider.discovery.privateEndpointsEnv),
      dedicatedEndpoints: readEndpointEnv(provider.discovery.dedicatedEndpointsEnv),
      discoveredAt,
      expiresAt: expiresAt.toISOString(),
      error: 'Provider does not publish a model discovery endpoint.',
    }, provider.discovery.cacheTtlMs)
  }

  try {
    const response = await (options.fetcher ?? fetch)(endpoint, {
      headers: credentialResult.key
        ? {
            [provider.auth.header]: `${provider.auth.prefix}${credentialResult.key}`,
            Accept: 'application/json',
          }
        : { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) {
      throw new Error(`Discovery returned HTTP ${response.status}.`)
    }
    const payload = await response.json() as unknown
    const records = modelRecords(payload)
    const models = records
      .map((record) => normalizeModel(provider, record, discoveredAt))
      .filter((model): model is DiscoveredModel => Boolean(model))
    const tasks = [...new Set(models.flatMap((model) =>
      stringList(model.raw.pipeline_tag ?? model.raw.task ?? model.raw.tasks),
    ))]
    const inferenceProviders = [...new Set(records.flatMap((record) =>
      providerNames(record.inferenceProviderMapping ?? record.providers),
    ))]
    return discoveryCache.set(cacheKey, {
      provider: providerId,
      status: 'ready',
      endpoint,
      keySource: credentialResult.source,
      models,
      tasks,
      inferenceProviders,
      privateEndpoints: readEndpointEnv(provider.discovery.privateEndpointsEnv),
      dedicatedEndpoints: readEndpointEnv(provider.discovery.dedicatedEndpointsEnv),
      discoveredAt,
      expiresAt: expiresAt.toISOString(),
      error: null,
    }, provider.discovery.cacheTtlMs)
  } catch (error) {
    const fallbackModels = providerId === 'genx'
      ? genxFallbackModels(options.capability, discoveredAt)
      : []
    if (fallbackModels.length > 0) {
      const tasks = [...new Set(fallbackModels.flatMap((model) => model.capabilities))]
      return discoveryCache.set(cacheKey, {
        provider: providerId,
        status: 'ready',
        endpoint,
        keySource: credentialResult.source,
        models: fallbackModels,
        tasks,
        inferenceProviders: [],
        privateEndpoints: readEndpointEnv(provider.discovery.privateEndpointsEnv),
        dedicatedEndpoints: readEndpointEnv(provider.discovery.dedicatedEndpointsEnv),
        discoveredAt,
        expiresAt: expiresAt.toISOString(),
        error: `GenX discovery failed; using static runtime fallback: ${sanitizeProviderError(error)}`,
      }, provider.discovery.cacheTtlMs)
    }

    return discoveryCache.set(cacheKey, {
      provider: providerId,
      status: 'failed',
      endpoint,
      keySource: credentialResult.source,
      models: [],
      tasks: [],
      inferenceProviders: [],
      privateEndpoints: readEndpointEnv(provider.discovery.privateEndpointsEnv),
      dedicatedEndpoints: readEndpointEnv(provider.discovery.dedicatedEndpointsEnv),
      discoveredAt,
      expiresAt: expiresAt.toISOString(),
      error: sanitizeProviderError(error),
    }, provider.discovery.cacheTtlMs)
  }
}

export function clearProviderDiscoveryCache(providerId?: ProviderId) {
  if (providerId) discoveryCache.deletePrefix(providerId)
  else discoveryCache.clear()
}

export function normalizeProviderCatalog(
  providerId: ProviderId,
  payload: unknown,
  discoveredAt = new Date().toISOString(),
): DiscoveredModel[] {
  const provider = PROVIDER_TRUTH.find((entry) => entry.id === providerId)
  if (!provider) return []
  return modelRecords(payload)
    .map((record) => normalizeModel(provider, record, discoveredAt))
    .filter((model): model is DiscoveredModel => Boolean(model))
}

export function resolveProviderEndpoint(
  provider: ProviderTruthDefinition,
  family?: string,
): string {
  const endpoint = family
    ? provider.endpoints.find((entry) => entry.family === family)
    : provider.endpoints[0]
  if (!endpoint) return ''
  const configured = provider.id === 'genx'
    ? resolveGenXEndpointBaseUrl(endpoint, family)
    : endpoint.baseUrlEnv && process.env[endpoint.baseUrlEnv]?.trim()
      ? process.env[endpoint.baseUrlEnv]!.trim()
      : endpoint.baseUrl
  const normalized = configured.replace(/\/+$/, '')
  if (provider.id === 'genx' && family === 'async_generation' && !/\/api\/v1$/i.test(normalized)) {
    return `${normalized}/api/v1`
  }
  if (provider.id === 'genx' && family === 'streaming_text' && !/\/v1$/i.test(normalized)) {
    return `${normalized}/v1`
  }
  return normalized
}

function resolveGenXEndpointBaseUrl(
  endpoint: ProviderTruthDefinition['endpoints'][number],
  family?: string,
): string {
  const configured = endpoint.baseUrlEnv && process.env[endpoint.baseUrlEnv]?.trim()
    ? process.env[endpoint.baseUrlEnv]!.trim()
    : family === 'streaming_text'
      ? process.env.GENX_TEXT_BASE_URL?.trim() || process.env.GENX_BASE_URL?.trim() || process.env.GENX_API_URL?.trim() || endpoint.baseUrl
      : process.env.GENX_BASE_URL?.trim() || process.env.GENX_API_URL?.trim() || endpoint.baseUrl
  return normalizeGenxBaseUrl(configured)
}

function normalizeGenxBaseUrl(raw: string): string {
  return normalizeGenXBaseUrl(raw) ?? raw.replace(/\/+$/, '')
}

function resolveDiscoveryUrl(
  provider: ProviderTruthDefinition,
  capability?: CapabilityId,
): string | null {
  if (!provider.discovery.models) return null
  if (/^https?:\/\//.test(provider.discovery.models)) {
    const url = new URL(provider.discovery.models)
    if (provider.id === 'huggingface') {
      url.searchParams.set('limit', '100')
      url.searchParams.set('full', 'true')
      const pipelineTag = capability ? HF_PIPELINE_TASK[capability] : null
      if (pipelineTag) url.searchParams.set('pipeline_tag', pipelineTag)
    }
    return url.toString()
  }
  const family = provider.id === 'genx'
    ? 'async_generation'
    : provider.id === 'qwen'
      ? 'compatible_mode'
      : undefined
  return `${resolveProviderEndpoint(provider, family)}${provider.discovery.models}`
}

function genxFallbackModels(
  capability?: CapabilityId,
  discoveredAt = new Date().toISOString(),
): DiscoveredModel[] {
  const entries = capability
    ? [[capability, GENX_FALLBACK_MODEL_CAPABILITIES[capability] ?? []] as const]
    : Object.entries(GENX_FALLBACK_MODEL_CAPABILITIES) as Array<[CapabilityId, readonly string[]]>
  const capabilitiesByModel = new Map<string, Set<CapabilityId>>()

  for (const [entryCapability, modelIds] of entries) {
    for (const id of modelIds) {
      const existing = capabilitiesByModel.get(id) ?? new Set<CapabilityId>()
      existing.add(entryCapability)
      capabilitiesByModel.set(id, existing)
    }
  }

  return [...capabilitiesByModel.entries()].map(([id, capabilitySet]) => {
    const capabilities = [...capabilitySet]
    return {
      provider: 'genx',
      id,
      capabilities,
      capabilityEvidence: 'provider_contract',
      status: 'available',
      speed: null,
      quality: null,
      cost: null,
      context: null,
      adult: 'unknown',
      streaming: 'unknown',
      research: 'unknown',
      artifactSupport: true,
      raw: {
        source: 'genx_static_runtime_fallback',
        capabilities,
      },
      discoveredAt,
    }
  })
}

function modelRecords(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter(isRecord)
  if (!isRecord(payload)) return []
  for (const key of ['data', 'models', 'items', 'results']) {
    const value = payload[key]
    if (Array.isArray(value)) return value.filter(isRecord)
  }
  return []
}

function normalizeModel(
  provider: ProviderTruthDefinition,
  record: Record<string, unknown>,
  discoveredAt: string,
): DiscoveredModel | null {
  const id = firstString(record.id, record.model, record.modelId, record.name)
  if (!id) return null
  const tasks = stringList(
    record.pipeline_tag,
    record.task,
    record.tasks,
    record.capability,
    record.capabilities,
    record.type,
    record.tags,
  )
  const descriptor = [
    id,
    ...tasks,
    firstString(record.display_name, record.displayName, record.description) ?? '',
  ].join(' ').toLowerCase()
  const capabilities = [...new Set([
    ...tasks.flatMap((task) => TASK_CAPABILITY_MAP[task.toLowerCase()] ?? []),
    ...descriptorCapabilities(descriptor),
  ])]
  const pricing = isRecord(record.pricing) ? Object.values(record.pricing) : []
  return {
    provider: provider.id,
    id,
    capabilities,
    capabilityEvidence: capabilities.length > 0 ? 'model_metadata' : 'unknown',
    status: availability(record),
    speed: metric(record.speed, record.latency_score),
    quality: metric(record.quality, record.quality_score),
    cost: metric(record.cost, record.cost_score, ...pricing),
    context: metric(record.context, record.context_length),
    adult: booleanOrUnknown(record.adult),
    streaming: booleanOrUnknown(
      record.streaming ?? record.supports_streaming ?? record.stream,
    ),
    research: booleanOrUnknown(record.research),
    artifactSupport: provider.features.artifactSupport,
    raw: record,
    discoveredAt,
  }
}

function descriptorCapabilities(descriptor: string): CapabilityId[] {
  const capabilities = new Set<CapabilityId>()
  const add = (capability: CapabilityId, pattern: RegExp) => {
    if (pattern.test(descriptor)) capabilities.add(capability)
  }
  add('stt', /\b(stt|asr|whisper|transcri(?:be|ption)|speech[-_\s]?to[-_\s]?text)\b/i)
  add('tts', /\b(tts|text[-_\s]?to[-_\s]?speech|speech[-_\s]?(?:generation|synthesis))\b/i)
  add('embeddings', /\b(embed(?:ding|dings)?|feature[-_\s]?extraction)\b/i)
  add('rerank', /\b(re[-_\s]?rank(?:er|ing)?|text[-_\s]?ranking)\b/i)
  add('image_edit', /\b(image[-_\s]?(?:edit|editing|inpaint)|inpainting)\b/i)
  add('image_to_video', /\b(image[-_\s]?to[-_\s]?video|i2v)\b/i)
  add('video', /\b(video|text[-_\s]?to[-_\s]?video|t2v)\b/i)
  add('image', /\b(image|text[-_\s]?to[-_\s]?image|diffusion)\b/i)
  add('vision', /\b(vision|visual|multimodal|image[-_\s]?text|(?:^|[-_/])vl(?:[-_/]|$))\b/i)
  add('ocr', /\bocr\b/i)
  add('music', /\b(music|text[-_\s]?to[-_\s]?audio)\b/i)
  add('translation', /\btranslat(?:e|ion)\b/i)
  add('coding', /\b(code|coder|coding)\b/i)
  add('reasoning', /\b(reason(?:ing)?|think(?:ing)?)\b/i)
  add('agents', /\b(agent|tool[-_\s]?calling|compound)\b/i)
  add('chat', /\b(chat|instruct|language|llm|text[-_\s]?generation|completion)\b/i)
  return [...capabilities]
}

function readEndpointEnv(envName: string | null): string[] {
  if (!envName) return []
  const raw = process.env[envName]?.trim()
  if (!raw) return []
  try {
    const value = JSON.parse(raw) as unknown
    if (Array.isArray(value)) {
      return value.flatMap((entry) => typeof entry === 'string'
        ? [entry]
        : isRecord(entry) && typeof entry.url === 'string' ? [entry.url] : [])
    }
  } catch {
    return raw.split(',').map((entry) => entry.trim()).filter(Boolean)
  }
  return []
}

function providerNames(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(providerNames)
  if (typeof value === 'string') return [value]
  if (isRecord(value)) return Object.keys(value)
  return []
}

function stringList(...values: unknown[]): string[] {
  return values.flatMap((value) => {
    if (typeof value === 'string') return [value]
    if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === 'string')
    return []
  })
}

function firstString(...values: unknown[]): string | null {
  return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim() ?? null
}

function metric(...values: unknown[]): number | null {
  for (const entry of values) {
    if (typeof entry === 'number' && Number.isFinite(entry)) return entry
    if (typeof entry === 'string' && entry.trim()) {
      const numeric = Number(entry)
      if (Number.isFinite(numeric)) return numeric
    }
  }
  return null
}

function availability(record: Record<string, unknown>): DiscoveredModel['status'] {
  if (record.available === true || record.active === true || record.status === 'available') return 'available'
  if (record.available === false || record.active === false || record.status === 'unavailable') return 'unavailable'
  return 'unknown'
}

function booleanOrUnknown(value: unknown): boolean | 'unknown' {
  return typeof value === 'boolean' ? value : 'unknown'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
