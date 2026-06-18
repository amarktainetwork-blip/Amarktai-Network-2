import {
  GENX_AUDIO_MODELS,
  GENX_I2V_MODELS,
  GENX_IMAGE_MODELS,
  GENX_STT_MODELS,
  GENX_TTS_MODELS,
  GENX_VIDEO_MODELS,
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
  'text_to_image': ['image'],
  image_generation: ['image'],
  'image-to-image': ['image_edit'],
  'image_to_image': ['image_edit'],
  image_text_to_image: ['image_edit'],
  'text-to-video': ['video'],
  'text_to_video': ['video'],
  video_generation: ['video'],
  'image-to-video': ['image_to_video'],
  image_text_to_video: ['image_to_video'],
  'text-to-audio': ['music'],
  'text-to-speech': ['tts'],
  text_to_speech: ['tts'],
  'automatic-speech-recognition': ['stt'],
  speech_to_text: ['stt'],
  'speech-to-text': ['stt'],
  'feature-extraction': ['embeddings'],
  feature_extraction: ['embeddings'],
  'sentence-similarity': ['embeddings'],
  'text-ranking': ['rerank'],
  text_ranking: ['rerank'],
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
    const headers = credentialResult.key
      ? {
          [provider.auth.header]: `${provider.auth.prefix}${credentialResult.key}`,
          Accept: 'application/json',
        }
      : { Accept: 'application/json' }
    const records = providerId === 'genx'
      ? await fetchGenxCategoryRecords(endpoint, headers, options.fetcher ?? fetch)
      : await fetchDiscoveryRecords(endpoint, headers, options.fetcher ?? fetch)
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
  const taskCapabilities = tasks.flatMap((task) => TASK_CAPABILITY_MAP[task.toLowerCase()] ?? [])
  const inferredContractCapabilities = inferProviderContractCapabilities(provider.id, id, descriptor, record)
  const capabilities = [...new Set([
    ...taskCapabilities,
    ...descriptorCapabilities(provider.id, id, descriptor),
    ...(taskCapabilities.length === 0 ? inferredContractCapabilities : []),
  ])]
  const pricing = isRecord(record.pricing) ? Object.values(record.pricing) : []
  return {
    provider: provider.id,
    id,
    capabilities,
    capabilityEvidence: taskCapabilities.length > 0 || descriptorCapabilities(provider.id, id, descriptor).length > 0
      ? 'model_metadata'
      : inferredContractCapabilities.length > 0 ? 'provider_contract' : 'unknown',
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

async function fetchDiscoveryRecords(
  endpoint: string,
  headers: Record<string, string>,
  fetcher: FetchLike,
) {
  const response = await fetcher(endpoint, {
    headers,
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) throw new Error(`Discovery returned HTTP ${response.status}.`)
  return modelRecords(await response.json() as unknown)
}

async function fetchGenxCategoryRecords(
  endpoint: string,
  headers: Record<string, string>,
  fetcher: FetchLike,
) {
  const urls = [
    endpoint,
    `${endpoint}?category=text`,
    `${endpoint}?category=image`,
    `${endpoint}?category=video`,
    `${endpoint}?category=voice`,
    `${endpoint}?category=audio`,
    `${endpoint}?category=transcription`,
  ]
  const records = new Map<string, Record<string, unknown>>()
  let lastError: Error | null = null
  for (const url of urls) {
    try {
      for (const record of await fetchDiscoveryRecords(url, headers, fetcher)) {
        const id = firstString(record.id, record.model, record.modelId, record.name)
        if (id) records.set(id, record)
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('GenX discovery failed.')
    }
  }
  if (records.size === 0 && lastError) throw lastError
  return [...records.values()]
}

function descriptorCapabilities(providerId: ProviderId, modelId: string, descriptor: string): CapabilityId[] {
  const lowerModelId = modelId.toLowerCase()
  const capabilities = new Set<CapabilityId>()
  const add = (capability: CapabilityId, pattern: RegExp) => {
    if (pattern.test(descriptor) || pattern.test(lowerModelId)) capabilities.add(capability)
  }
  if (providerId === 'huggingface') {
    add('image', /\b(text[-_\s]?to[-_\s]?image|diffusion|sdxl|stable[-_\s]?diffusion|flux|pixart|kolors|recraft)\b/i)
    add('image_edit', /\b(image[-_\s]?to[-_\s]?image|image[-_\s]?(?:edit|editing)|inpaint(?:ing)?)\b/i)
    add('image_to_video', /\b(image[-_\s]?to[-_\s]?video|i2v)\b/i)
    add('video', /\b(text[-_\s]?to[-_\s]?video|video|wan|cogvideo|mochi|ltx[-_\s]?video|hunyuanvideo)\b/i)
    add('tts', /\b(text[-_\s]?to[-_\s]?speech|tts|mms[-_]?tts|bark|speech[-_\s]synthesis)\b/i)
    add('stt', /\b(automatic[-_\s]?speech[-_\s]?recognition|asr|whisper|speech[-_\s]?to[-_\s]?text|transcri(?:be|ption))\b/i)
    add('embeddings', /\b(feature[-_\s]?extraction|embedding|sentence[-_\s]?transformers|mini?lm|bge|gte|e5)\b/i)
    add('rerank', /\b(text[-_\s]?ranking|rerank(?:er|ing)?|bge[-_\s]?reranker)\b/i)
  } else if (providerId === 'qwen') {
    add('image', /\b(qwen-image|wanx.*(?:t2i|image)|text2image|image[-_\s]synthesis)\b/i)
    add('video', /\b(wan.*t2v|video[-_\s]synthesis|text[-_\s]?to[-_\s]?video)\b/i)
    add('image_to_video', /\b(wan.*i2v|image[-_\s]?to[-_\s]?video|i2v)\b/i)
    add('tts', /\bqwen3-tts\b/i)
    add('stt', /\bqwen3-asr\b/i)
    add('embeddings', /\b(embed(?:ding)?|text[-_\s]?embedding)\b/i)
  } else if (providerId === 'together') {
    add('image', /\b(flux|recraft|stable[-_\s]?diffusion|playground|image)\b/i)
    add('video', /\b(video|kling|wan|seedance|mochi|hunyuanvideo|luma|minimax\/)\b/i)
    add('image_to_video', /\b(i2v|image[-_\s]?to[-_\s]?video)\b/i)
    add('tts', /\b(orpheus|tts|text[-_\s]?to[-_\s]?speech|speech[-_\s]synthesis)\b/i)
    add('stt', /\b(whisper|asr|transcri(?:be|ption))\b/i)
    add('embeddings', /\b(embedding|jina-embeddings|bge|e5)\b/i)
    add('rerank', /\b(rerank(?:er|ing)?|text[-_\s]?ranking)\b/i)
  } else if (providerId === 'groq') {
    add('tts', /\b(orpheus|tts|text[-_\s]?to[-_\s]?speech|speech[-_\s]synthesis)\b/i)
    add('stt', /\b(whisper|asr|speech[-_\s]?to[-_\s]?text|transcri(?:be|ption))\b/i)
  } else if (providerId === 'mimo') {
    add('tts', /\b(tts|speech[-_\s]generation|text[-_\s]?to[-_\s]?speech|voice)\b/i)
    add('stt', /\b(asr|speech[-_\s]?to[-_\s]?text|transcri(?:be|ption)|whisper)\b/i)
  } else if (providerId === 'genx') {
    add('image', /\b(image|recraft|banana|grok[-_]?imagine)\b/i)
    add('video', /\b(video|veo|kling|seedance|pixverse)\b/i)
    add('image_to_video', /\b(i2v|image[-_\s]?to[-_\s]?video)\b/i)
    add('tts', /\b(tts|aura|voice)\b/i)
    add('stt', /\b(stt|speech[-_\s]?to[-_\s]?text|transcri(?:be|ption))\b/i)
    add('music', /\b(music|audio|lyria)\b/i)
  }

  if (!capabilities.has('tts') && !capabilities.has('stt')) {
    add('translation', /\btranslat(?:e|ion)\b/i)
    add('coding', /\b(code|coder|coding)\b/i)
    add('reasoning', /\b(reason(?:ing)?|think(?:ing)?|r1)\b/i)
    add('agents', /\b(agent|tool[-_\s]?calling|compound)\b/i)
    if (!isAudioModel(providerId, lowerModelId) && !isMediaModel(providerId, lowerModelId)) {
      add('chat', /\b(chat|instruct|language|llm|text[-_\s]?generation|completion|assistant)\b/i)
    }
  }

  if (providerId !== 'groq' || capabilities.has('stt') || capabilities.has('tts') || capabilities.has('vision')) {
    add('vision', /\b(vision|visual|multimodal|image[-_\s]?text|(?:^|[-_/])vl(?:[-_/]|$))\b/i)
    add('ocr', /\bocr\b/i)
    if ((providerId === 'huggingface' || providerId === 'groq') && /\b(image[-_\s]?text[-_\s]?to[-_\s]?text|image[-_\s]?to[-_\s]?text|visual)\b/i.test(descriptor)) {
      capabilities.add('image')
    }
  }
  return [...capabilities]
}

function inferProviderContractCapabilities(
  providerId: ProviderId,
  modelId: string,
  descriptor: string,
  record: Record<string, unknown>,
): CapabilityId[] {
  const lowerModelId = modelId.toLowerCase()
  const category = firstString(record.category, record.type)?.toLowerCase() ?? ''

  if (providerId === 'genx') {
    const capabilities = new Set<CapabilityId>()
    if (GENX_IMAGE_MODELS.some((entry) => entry.toLowerCase() === lowerModelId) || category === 'image') capabilities.add('image')
    if (GENX_VIDEO_MODELS.some((entry) => entry.toLowerCase() === lowerModelId) || category === 'video') capabilities.add('video')
    if (GENX_I2V_MODELS.some((entry) => entry.toLowerCase() === lowerModelId)) capabilities.add('image_to_video')
    if (GENX_AUDIO_MODELS.some((entry) => entry.toLowerCase() === lowerModelId) || category === 'audio') capabilities.add('music')
    if (GENX_TTS_MODELS.some((entry) => entry.toLowerCase() === lowerModelId) || category === 'voice') capabilities.add('tts')
    if (GENX_STT_MODELS.some((entry) => entry.toLowerCase() === lowerModelId) || category === 'transcription') capabilities.add('stt')
    if (category === 'text' || (!capabilities.size && GENX_TEXT_HINT.test(descriptor))) {
      capabilities.add('chat')
      if (/code|coder|codex/.test(descriptor)) capabilities.add('coding')
      if (/reason|think/.test(descriptor)) capabilities.add('reasoning')
    }
    return [...capabilities]
  }

  if (providerId === 'qwen') return providerContractFromPatterns(lowerModelId, descriptor, {
    image: [/qwen-image/, /wanx.*(?:t2i|image)/],
    video: [/wan.*t2v/, /video[-_\s]?synthesis/],
    image_to_video: [/wan.*i2v/, /image[-_\s]?to[-_\s]?video/, /\bi2v\b/],
    tts: [/qwen3-tts/],
    stt: [/qwen3-asr/],
    embeddings: [/embed(?:ding)?/, /text[-_\s]?embedding/],
    translation: [/translat/],
    chat: [/qwen[-_].*(turbo|plus|max|chat|instruct)/, /deepseek/],
    reasoning: [/qwen[-_].*(plus|max|reason)/, /deepseek[-_/].*r1/],
    coding: [/coder/, /code/],
  })

  if (providerId === 'together') return providerContractFromPatterns(lowerModelId, descriptor, {
    image: [/flux/, /recraft/, /stable[-_]?diffusion/, /playground/, /seedream/, /image/],
    video: [/video/, /kling/, /wan/, /seedance/, /mochi/, /hunyuanvideo/, /luma/, /minimax\//],
    image_to_video: [/\bi2v\b/, /image[-_\s]?to[-_\s]?video/],
    tts: [/orpheus/, /\btts\b/, /speech/],
    stt: [/whisper/, /\basr\b/, /transcri/],
    embeddings: [/embedding/, /jina-embeddings/, /bge/, /\be5\b/],
    rerank: [/rerank/, /text[-_\s]?ranking/],
    chat: [/llama/, /mistral/, /qwen/, /gemma/, /chat/, /instruct/],
    reasoning: [/reason/, /deepseek.*r1/],
    coding: [/coder/, /code/],
  })

  if (providerId === 'groq') return providerContractFromPatterns(lowerModelId, descriptor, {
    tts: [/orpheus/, /\btts\b/, /speech/],
    stt: [/whisper/, /\basr\b/, /transcri/],
    chat: [/llama/, /gemma/, /qwen/, /chat/, /instruct/, /versatile/],
    reasoning: [/reason/, /deepseek.*r1/],
    coding: [/coder/, /code/],
  }, { excludeTextIfMatched: ['tts', 'stt'] })

  if (providerId === 'mimo') return providerContractFromPatterns(lowerModelId, descriptor, {
    tts: [/\btts\b/, /speech/, /voice/],
    stt: [/\basr\b/, /transcri/, /speech[-_\s]?to[-_\s]?text/, /whisper/],
    chat: [/mimo-v/, /chat/, /instruct/],
    reasoning: [/reason/],
    coding: [/coder/, /code/],
  }, { excludeTextIfMatched: ['tts', 'stt'] })

  if (providerId === 'huggingface') return providerContractFromPatterns(lowerModelId, descriptor, {
    image: [/flux/, /stable[-_]?diffusion/, /sdxl/, /pixart/, /kolors/, /recraft/],
    image_edit: [/inpaint/, /image[-_]?edit/],
    video: [/wan/, /cogvideo/, /mochi/, /ltx[-_]?video/, /hunyuanvideo/, /text[-_\s]?to[-_\s]?video/],
    image_to_video: [/\bi2v\b/, /image[-_\s]?to[-_\s]?video/],
    tts: [/mms-tts/, /\btts\b/, /bark/],
    stt: [/whisper/, /\basr\b/, /transcri/],
    embeddings: [/sentence-transformers/, /embedding/, /mini?lm/, /bge/, /gte/, /\be5\b/],
    rerank: [/rerank/, /text[-_\s]?ranking/, /bge[-_]?reranker/],
    documents: [/document[-_]?question[-_]?answering/],
    translation: [/translat/],
    vision: [/vision/, /visual/, /image[-_\s]?text/, /(?:^|[-_/])vl(?:[-_/]|$)/],
    ocr: [/ocr/],
    chat: [/llama/, /mistral/, /gemma/, /chat/, /instruct/],
    reasoning: [/reason/, /deepseek.*r1/],
    coding: [/coder/, /code/],
  }, { excludeTextIfMatched: ['image', 'image_edit', 'video', 'image_to_video', 'tts', 'stt', 'embeddings', 'rerank', 'documents', 'translation', 'vision', 'ocr'] })

  return []
}

function providerContractFromPatterns(
  modelId: string,
  descriptor: string,
  patterns: Partial<Record<CapabilityId, RegExp[]>>,
  options: { excludeTextIfMatched?: CapabilityId[] } = {},
): CapabilityId[] {
  const matched = new Set<CapabilityId>()
  for (const [capability, matchers] of Object.entries(patterns) as Array<[CapabilityId, RegExp[] | undefined]>) {
    if (matchers?.some((pattern) => pattern.test(modelId) || pattern.test(descriptor))) {
      matched.add(capability)
    }
  }
  if (options.excludeTextIfMatched?.some((capability) => matched.has(capability))) {
    matched.delete('chat')
    matched.delete('reasoning')
    matched.delete('coding')
  }
  return [...matched]
}

function isAudioModel(providerId: ProviderId, modelId: string) {
  return providerContractFromPatterns(modelId, modelId, providerId === 'groq'
    ? { tts: [/orpheus/, /tts/, /text[-_\s]?to[-_\s]?speech/, /speech[-_\s]synthesis/], stt: [/whisper/, /asr/, /speech[-_\s]?to[-_\s]?text/, /transcri/] }
    : providerId === 'mimo'
      ? { tts: [/tts/, /text[-_\s]?to[-_\s]?speech/, /speech[-_\s]generation/, /voice/], stt: [/asr/, /speech[-_\s]?to[-_\s]?text/, /transcri/, /whisper/] }
      : providerId === 'qwen'
        ? { tts: [/qwen3-tts/], stt: [/qwen3-asr/] }
        : providerId === 'together'
          ? { tts: [/orpheus/, /tts/, /text[-_\s]?to[-_\s]?speech/, /speech[-_\s]synthesis/], stt: [/whisper/, /asr/, /speech[-_\s]?to[-_\s]?text/, /transcri/] }
          : providerId === 'huggingface'
            ? { tts: [/mms-tts/, /tts/, /bark/, /text[-_\s]?to[-_\s]?speech/], stt: [/whisper/, /asr/, /speech[-_\s]?to[-_\s]?text/, /transcri/] }
            : { tts: [/tts/, /voice/], stt: [/stt/, /transcri/] }).length > 0
}

function isMediaModel(providerId: ProviderId, modelId: string) {
  return providerContractFromPatterns(modelId, modelId, providerId === 'qwen'
    ? { image: [/qwen-image/, /wanx.*(?:t2i|image)/], video: [/wan.*t2v/], image_to_video: [/wan.*i2v/] }
    : providerId === 'together'
      ? { image: [/flux/, /recraft/, /stable[-_]?diffusion/, /image/], video: [/video/, /kling/, /wan/, /seedance/, /mochi/, /hunyuanvideo/, /minimax\//], image_to_video: [/i2v/] }
      : providerId === 'huggingface'
        ? { image: [/flux/, /stable[-_]?diffusion/, /sdxl/, /pixart/, /kolors/, /recraft/], video: [/wan/, /cogvideo/, /mochi/, /ltx[-_]?video/, /hunyuanvideo/], image_to_video: [/i2v/] }
        : providerId === 'genx'
          ? { image: [/image/, /recraft/, /banana/, /imagine/], video: [/video/, /veo/, /kling/, /seedance/, /pixverse/], image_to_video: [/i2v/] }
          : {}).length > 0
}

const GENX_TEXT_HINT = /\b(gpt|claude|gemini|grok|chat|text|language|codex|coder|reason)\b/i

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
